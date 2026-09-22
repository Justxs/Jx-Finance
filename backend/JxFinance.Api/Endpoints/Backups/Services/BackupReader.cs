using System.Text.Json;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.Services;

public sealed class BackupReader(IBackupVisitor visitor)
{
    private const int InitialBufferBytes = 64 * 1024;
    private const int MaximumTokenBytes = 16 * 1024 * 1024;

    private readonly List<Step> steps = [];
    private JsonReaderState state = new(new JsonReaderOptions { MaxDepth = 8 });
    private Position position = Position.Start;
    private string? property;
    private string? format;
    private int? version;
    private DateTimeOffset? createdAt;
    private string? migration;
    private bool tablesSeen;
    private string? tableName;
    private List<string>? columns;
    private bool rowsSeen;
    private List<string?> row = [];

    private enum Position
    {
        Start,
        Root,
        RootValue,
        Tables,
        Table,
        TableValue,
        Columns,
        Rows,
        Row,
        Done,
    }

    private enum StepKind
    {
        Begin,
        BeginTable,
        Row,
        EndTable,
    }

    public async Task ReadAsync(Stream input, CancellationToken cancellationToken)
    {
        var buffer = new byte[InitialBufferBytes];
        var filled = 0;
        var isFinal = false;

        while (!isFinal)
        {
            var read = await input.ReadAsync(buffer.AsMemory(filled), cancellationToken);
            isFinal = read == 0;
            filled += read;

            var consumed = Parse(buffer.AsSpan(0, filled), isFinal);
            filled -= consumed;
            buffer.AsSpan(consumed, filled).CopyTo(buffer);
            if (filled == buffer.Length)
            {
                if (buffer.Length >= MaximumTokenBytes) throw new BackupFileException();
                Array.Resize(ref buffer, buffer.Length * 2);
            }

            await PublishAsync(cancellationToken);
        }

        if (position != Position.Done || !tablesSeen) throw new BackupFileException();
    }

    private async Task PublishAsync(CancellationToken cancellationToken)
    {
        foreach (var step in steps)
        {
            await (step.Kind switch
            {
                StepKind.Begin => visitor.BeginAsync(step.Header!, cancellationToken),
                StepKind.BeginTable => visitor.BeginTableAsync(step.Name!, step.Columns!, cancellationToken),
                StepKind.Row => visitor.RowAsync(step.Row!, cancellationToken),
                _ => visitor.EndTableAsync(cancellationToken),
            });
        }

        steps.Clear();
    }

    private int Parse(ReadOnlySpan<byte> data, bool isFinal)
    {
        var reader = new Utf8JsonReader(data, isFinal, state);
        while (reader.Read())
        {
            Accept(ref reader);
        }

        state = reader.CurrentState;
        return (int)reader.BytesConsumed;
    }

    private void Accept(ref Utf8JsonReader reader)
    {
        var token = reader.TokenType;
        switch (position)
        {
            case Position.Start when token == JsonTokenType.StartObject:
                position = Position.Root;
                break;
            case Position.Root when token == JsonTokenType.EndObject:
                position = Position.Done;
                break;
            case Position.Root when token == JsonTokenType.PropertyName:
                property = reader.GetString();
                position = Position.RootValue;
                break;
            case Position.RootValue:
                AcceptRootValue(ref reader);
                break;
            case Position.Tables when token == JsonTokenType.EndArray:
                position = Position.Root;
                break;
            case Position.Tables when token == JsonTokenType.StartObject:
                tableName = null;
                columns = null;
                rowsSeen = false;
                position = Position.Table;
                break;
            case Position.Table when token == JsonTokenType.EndObject && rowsSeen:
                steps.Add(new Step(StepKind.EndTable));
                position = Position.Tables;
                break;
            case Position.Table when token == JsonTokenType.PropertyName:
                property = reader.GetString();
                position = Position.TableValue;
                break;
            case Position.TableValue:
                AcceptTableValue(ref reader);
                break;
            case Position.Columns when token == JsonTokenType.EndArray:
                position = Position.Table;
                break;
            case Position.Columns when token == JsonTokenType.String:
                columns!.Add(reader.GetString()!);
                break;
            case Position.Rows when token == JsonTokenType.EndArray:
                rowsSeen = true;
                position = Position.Table;
                break;
            case Position.Rows when token == JsonTokenType.StartArray:
                row = new List<string?>(columns!.Count);
                position = Position.Row;
                break;
            case Position.Row when token == JsonTokenType.EndArray:
                steps.Add(new Step(StepKind.Row, Row: row));
                position = Position.Rows;
                break;
            case Position.Row when token is JsonTokenType.String or JsonTokenType.Null:
                row.Add(reader.GetString());
                break;
            default:
                throw new BackupFileException();
        }
    }

    private void AcceptRootValue(ref Utf8JsonReader reader)
    {
        var token = reader.TokenType;
        switch (property)
        {
            case BackupJsonNames.Format when token == JsonTokenType.String:
                format = reader.GetString();
                break;
            case BackupJsonNames.Version when token == JsonTokenType.Number && reader.TryGetInt32(out var number):
                version = number;
                break;
            case BackupJsonNames.CreatedAt when token == JsonTokenType.String && reader.TryGetDateTimeOffset(out var moment):
                createdAt = moment;
                break;
            case BackupJsonNames.Migration when token is JsonTokenType.String or JsonTokenType.Null:
                migration = reader.GetString();
                break;
            case BackupJsonNames.Tables when token == JsonTokenType.StartArray && !tablesSeen && version is { } known && createdAt is { } taken:
                tablesSeen = true;
                steps.Add(new Step(StepKind.Begin, Header: new BackupHeader(format, known, taken, migration)));
                position = Position.Tables;
                return;
            default:
                throw new BackupFileException();
        }

        position = Position.Root;
    }

    private void AcceptTableValue(ref Utf8JsonReader reader)
    {
        var token = reader.TokenType;
        switch (property)
        {
            case BackupJsonNames.Name when token == JsonTokenType.String:
                tableName = reader.GetString();
                position = Position.Table;
                break;
            case BackupJsonNames.Columns when token == JsonTokenType.StartArray && columns is null:
                columns = [];
                position = Position.Columns;
                break;
            case BackupJsonNames.Rows when token == JsonTokenType.StartArray && !rowsSeen && tableName is not null && columns is not null:
                steps.Add(new Step(StepKind.BeginTable, Name: tableName, Columns: columns));
                position = Position.Rows;
                break;
            default:
                throw new BackupFileException();
        }
    }

    private sealed record Step(
        StepKind Kind,
        BackupHeader? Header = null,
        string? Name = null,
        IReadOnlyList<string>? Columns = null,
        IReadOnlyList<string?>? Row = null);
}
