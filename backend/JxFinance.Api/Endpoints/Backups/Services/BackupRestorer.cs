using JxFinance.Common.Errors;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using NpgsqlTypes;

namespace JxFinance.Endpoints.Backups.Services;

public sealed class BackupRestorer(
    AppDbContext db,
    List<TableShape> shapes,
    string migration,
    int lockTimeoutSeconds) : IBackupVisitor, IAsyncDisposable
{
    private const int InsertBatchSize = 500;

    private readonly Dictionary<string, TableShape> exported =
        shapes.Where(t => t.Exported).ToDictionary(t => t.Name, StringComparer.Ordinal);

    private readonly HashSet<string> restored = new(StringComparer.Ordinal);
    private readonly List<IReadOnlyList<string?>> pending = new(InsertBatchSize);
    private IDbContextTransaction? transaction;
    private string insertSql = "";
    private int columnCount;

    public BackupHeader? Header { get; private set; }

    public int Tables => restored.Count;

    public long Rows { get; private set; }

    private NpgsqlConnection Connection => (NpgsqlConnection)db.Database.GetDbConnection();

    public async Task BeginAsync(BackupHeader header, CancellationToken cancellationToken)
    {
        BackupService.EnsureSupported(header);
        if (!string.Equals(header.Migration, migration, StringComparison.Ordinal))
        {
            throw new BackupFileException(
                ErrorCodes.BackupSchemaMismatch,
                $"The backup was taken at database version '{header.Migration}', but this application runs '{migration}'. "
                + "Restore it with the application version that created it, then upgrade.");
        }

        Header = header;
        transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await BackupDatabase.ExecuteAsync(Connection, $"SET LOCAL lock_timeout = '{lockTimeoutSeconds}s'", cancellationToken);
        await BackupDatabase.SetForeignKeysAsync(Connection, shapes, "DEFERRABLE INITIALLY DEFERRED", cancellationToken);
        await BackupDatabase.ExecuteAsync(
            Connection,
            $"TRUNCATE TABLE {string.Join(", ", shapes.Select(t => t.QuotedName))}",
            cancellationToken);
    }

    public Task BeginTableAsync(string name, IReadOnlyList<string> columns, CancellationToken cancellationToken)
    {
        if (!exported.TryGetValue(name, out var shape)
            || !restored.Add(name)
            || !columns.Order(StringComparer.Ordinal).SequenceEqual(
                shape.Columns.Select(c => c.Name).Order(StringComparer.Ordinal), StringComparer.Ordinal))
        {
            throw Mismatch();
        }

        var storeTypes = shape.Columns.ToDictionary(c => c.Name, c => c.StoreType, StringComparer.Ordinal);
        var names = string.Join(", ", columns.Select(BackupDatabase.Quote));
        var values = string.Join(", ", columns.Select((column, i) => $"CAST(${i + 1} AS {storeTypes[column]})"));
        insertSql = $"INSERT INTO {shape.QuotedName} ({names}) VALUES ({values})";
        columnCount = columns.Count;
        return Task.CompletedTask;
    }

    public Task RowAsync(IReadOnlyList<string?> row, CancellationToken cancellationToken)
    {
        if (row.Count != columnCount) throw Mismatch();

        pending.Add(row);
        Rows++;
        return pending.Count == InsertBatchSize ? FlushAsync(cancellationToken) : Task.CompletedTask;
    }

    public Task EndTableAsync(CancellationToken cancellationToken) => FlushAsync(cancellationToken);

    public async Task CompleteAsync(CancellationToken cancellationToken)
    {
        if (transaction is null || restored.Count != exported.Count) throw Mismatch();

        await BackupDatabase.ExecuteAsync(Connection, "SET CONSTRAINTS ALL IMMEDIATE", cancellationToken);
        await BackupDatabase.SetForeignKeysAsync(Connection, shapes, "NOT DEFERRABLE", cancellationToken);
        await BackupDatabase.ResetSequencesAsync(Connection, shapes, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async ValueTask DisposeAsync()
    {
        if (transaction is not null) await transaction.DisposeAsync();
    }

    private static BackupFileException Mismatch() => new("The tables in the backup do not match this application.");

    private async Task FlushAsync(CancellationToken cancellationToken)
    {
        if (pending.Count == 0) return;

        await using var batch = new NpgsqlBatch(Connection, (NpgsqlTransaction)transaction!.GetDbTransaction());
        foreach (var row in pending)
        {
            var command = new NpgsqlBatchCommand(insertSql);
            foreach (var value in row)
            {
                command.Parameters.Add(new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Text, Value = (object?)value ?? DBNull.Value });
            }

            batch.BatchCommands.Add(command);
        }

        await batch.ExecuteNonQueryAsync(cancellationToken);
        pending.Clear();
    }
}
