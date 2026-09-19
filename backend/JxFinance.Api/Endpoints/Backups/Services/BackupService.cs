using System.Data;
using System.IO.Compression;
using System.Text.Json;
using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.RestoreBackup;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Backups;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using NpgsqlTypes;

namespace JxFinance.Endpoints.Backups.Services;

[RegisterService<IBackupService>(LifeTime.Scoped)]
public sealed class BackupService(
    AppDbContext db,
    BackupStore backups,
    IInstanceSettingsStore store,
    IClock clock,
    ILogger<BackupService> logger) : IBackupService
{
    public const string Format = "jx-finance-backup";
    public const int Version = 1;

    private const int InsertBatchSize = 500;
    private const int FlushEveryRows = 1000;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<IReadOnlyList<BackupResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var migration = await CurrentMigrationAsync(cancellationToken);
        return (await backups.ListAsync(cancellationToken)).Select(b => ToResponse(b, migration)).ToList();
    }

    public async Task<BackupResponse> CreateAsync(string? note, CancellationToken cancellationToken)
    {
        var id = Guid.NewGuid();
        var migration = await CurrentMigrationAsync(cancellationToken);
        var createdAt = clock.UtcNow;

        var stored = await backups.AddAsync(
            id,
            async stream =>
            {
                var (tables, rows) = await WriteAsync(stream, createdAt, migration, cancellationToken);
                return new StoredBackup(id, createdAt, Clean(note), migration, tables, rows, Uploaded: false);
            },
            cancellationToken);

        logger.LogInformation("Backup {BackupId} created: {Rows} rows, {Size} bytes.", id, stored.Rows, stored.SizeBytes);
        return ToResponse(stored, migration);
    }

    public async Task<Result<BackupResponse>> UploadAsync(Stream input, string? note, CancellationToken cancellationToken)
    {
        var (document, compressed) = await ReadDocumentAsync(input, cancellationToken);
        if (document?.Tables is null || document.Format != Format || document.Version != Version
            || document.Tables.Any(t => t.Rows is null))
        {
            return Result<BackupResponse>.Failure(ErrorCodes.BackupInvalidFile, "The file is not a Jx Finance backup.");
        }

        var id = Guid.NewGuid();
        var stored = await backups.AddAsync(
            id,
            async stream =>
            {
                input.Position = 0;
                if (compressed)
                {
                    await input.CopyToAsync(stream, cancellationToken);
                }
                else
                {
                    await using var gzip = new GZipStream(stream, CompressionLevel.Optimal, leaveOpen: true);
                    await input.CopyToAsync(gzip, cancellationToken);
                }

                return new StoredBackup(
                    id,
                    document.CreatedAt,
                    Clean(note),
                    document.Migration ?? "",
                    document.Tables.Count,
                    document.Tables.Sum(t => (long)t.Rows!.Count),
                    Uploaded: true);
            },
            cancellationToken);

        return Result<BackupResponse>.Success(ToResponse(stored, await CurrentMigrationAsync(cancellationToken)));
    }

    public async Task<Result<BackupResponse>> UpdateAsync(Guid id, string? note, CancellationToken cancellationToken)
    {
        if (await backups.FindAsync(id, cancellationToken) is not { } stored)
        {
            return NotFound<BackupResponse>();
        }

        var updated = stored with { Note = Clean(note) };
        await backups.SaveAsync(updated, cancellationToken);
        return Result<BackupResponse>.Success(ToResponse(updated, await CurrentMigrationAsync(cancellationToken)));
    }

    public async Task<Result<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        if (await backups.FindAsync(id, cancellationToken) is null)
        {
            return NotFound<bool>();
        }

        backups.Delete(id);
        logger.LogInformation("Backup {BackupId} deleted.", id);
        return Result<bool>.Success(true);
    }

    public async Task<Result<BackupDownload>> OpenAsync(Guid id, CancellationToken cancellationToken)
    {
        if (await backups.FindAsync(id, cancellationToken) is not { } stored)
        {
            return NotFound<BackupDownload>();
        }

        return Result<BackupDownload>.Success(new BackupDownload(
            backups.OpenRead(id),
            $"jx-finance-backup-{stored.CreatedAt.UtcDateTime:yyyyMMdd-HHmmss}.json.gz",
            stored.SizeBytes));
    }

    public async Task<Result<RestoreBackupResponse>> RestoreAsync(Guid id, CancellationToken cancellationToken)
    {
        if (await backups.FindAsync(id, cancellationToken) is null)
        {
            return NotFound<RestoreBackupResponse>();
        }

        await using var stream = backups.OpenRead(id);
        return await RestoreAsync(stream, cancellationToken);
    }

    private static Result<T> NotFound<T>() =>
        Result<T>.Failure(ErrorCodes.ResourceNotFound, "The backup does not exist.");

    private static string? Clean(string? note) => string.IsNullOrWhiteSpace(note) ? null : note.Trim();

    private static BackupResponse ToResponse(StoredBackup backup, string migration) => new(
        backup.Id,
        backup.CreatedAt,
        backup.Note,
        backup.SizeBytes,
        backup.Tables,
        backup.Rows,
        backup.Uploaded,
        string.Equals(backup.Migration, migration, StringComparison.Ordinal));

    private async Task<(int Tables, long Rows)> WriteAsync(
        Stream output,
        DateTimeOffset createdAt,
        string migration,
        CancellationToken cancellationToken)
    {
        long rows = 0;
        var tables = ReadShapes().Where(t => t.Exported).ToList();

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, cancellationToken);
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();

        await using var gzip = new GZipStream(output, CompressionLevel.Optimal, leaveOpen: true);
        await using var json = new Utf8JsonWriter(gzip);

        json.WriteStartObject();
        json.WriteString("format", Format);
        json.WriteNumber("version", Version);
        json.WriteString("createdAt", createdAt);
        json.WriteString("migration", migration);
        json.WriteStartArray("tables");

        foreach (var table in tables)
        {
            json.WriteStartObject();
            json.WriteString("name", table.Name);
            json.WriteStartArray("columns");
            foreach (var column in table.Columns) json.WriteStringValue(column.Name);
            json.WriteEndArray();
            json.WriteStartArray("rows");
            rows += await WriteRowsAsync(connection, table, json, cancellationToken);
            json.WriteEndArray();
            json.WriteEndObject();
        }

        json.WriteEndArray();
        json.WriteEndObject();
        await json.FlushAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return (tables.Count, rows);
    }

    private async Task<Result<RestoreBackupResponse>> RestoreAsync(Stream input, CancellationToken cancellationToken)
    {
        var (document, _) = await ReadDocumentAsync(input, cancellationToken);
        if (document is null || document.Format != Format || document.Version != Version || document.Tables is null)
        {
            return Invalid("The file is not a Jx Finance backup.");
        }

        var migration = await CurrentMigrationAsync(cancellationToken);
        if (!string.Equals(document.Migration, migration, StringComparison.Ordinal))
        {
            return Result<RestoreBackupResponse>.Failure(
                ErrorCodes.BackupSchemaMismatch,
                $"The backup was taken at database version '{document.Migration}', but this application runs '{migration}'. "
                + "Restore it with the application version that created it, then upgrade.");
        }

        var shapes = ReadShapes();
        var exported = shapes.Where(t => t.Exported).ToDictionary(t => t.Name, StringComparer.Ordinal);
        if (!Matches(document.Tables, exported))
        {
            return Invalid("The tables in the backup do not match this application.");
        }

        long rows = 0;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        var npgsqlTransaction = (NpgsqlTransaction)transaction.GetDbTransaction();

        try
        {
            await SetForeignKeysAsync(connection, shapes, "DEFERRABLE INITIALLY DEFERRED", cancellationToken);
            await ExecuteAsync(
                connection,
                $"TRUNCATE TABLE {string.Join(", ", shapes.Select(t => t.QuotedName))}",
                cancellationToken);

            foreach (var table in document.Tables)
            {
                rows += await InsertRowsAsync(connection, npgsqlTransaction, exported[table.Name!], table, cancellationToken);
            }

            await ExecuteAsync(connection, "SET CONSTRAINTS ALL IMMEDIATE", cancellationToken);
            await SetForeignKeysAsync(connection, shapes, "NOT DEFERRABLE", cancellationToken);
            await ResetSequencesAsync(connection, shapes, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (PostgresException ex) when (ex.SqlState.StartsWith("22", StringComparison.Ordinal)
            || ex.SqlState.StartsWith("23", StringComparison.Ordinal))
        {
            await transaction.RollbackAsync(cancellationToken);
            logger.LogWarning(ex, "Backup restore was rolled back because the file holds data the database rejects.");
            return Invalid("The backup holds data the database rejects. Nothing was changed.");
        }

        db.ChangeTracker.Clear();
        store.Set(await db.InstanceSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken) ?? store.Defaults());
        logger.LogWarning(
            "Installation restored from a backup taken at {CreatedAt}: {Tables} tables, {Rows} rows.",
            document.CreatedAt,
            document.Tables.Count,
            rows);

        return Result<RestoreBackupResponse>.Success(new RestoreBackupResponse(document.CreatedAt, document.Tables.Count, rows));
    }

    private static Result<RestoreBackupResponse> Invalid(string message) =>
        Result<RestoreBackupResponse>.Failure(ErrorCodes.BackupInvalidFile, message);

    private static async Task<(BackupDocument? Document, bool Compressed)> ReadDocumentAsync(Stream input, CancellationToken cancellationToken)
    {
        var magic = new byte[2];
        var read = await input.ReadAtLeastAsync(magic, 2, throwOnEndOfStream: false, cancellationToken);
        input.Position = 0;
        var compressed = read == 2 && magic[0] == 0x1f && magic[1] == 0x8b;

        try
        {
            if (!compressed)
            {
                return (await JsonSerializer.DeserializeAsync<BackupDocument>(input, JsonOptions, cancellationToken), false);
            }

            await using var gzip = new GZipStream(input, CompressionMode.Decompress, leaveOpen: true);
            return (await JsonSerializer.DeserializeAsync<BackupDocument>(gzip, JsonOptions, cancellationToken), true);
        }
        catch (Exception ex) when (ex is JsonException or InvalidDataException)
        {
            return (null, compressed);
        }
    }

    private static bool Matches(IReadOnlyList<BackupTable> tables, Dictionary<string, TableShape> exported)
    {
        var names = new HashSet<string>(StringComparer.Ordinal);
        foreach (var table in tables)
        {
            if (table.Name is null || table.Columns is null || table.Rows is null) return false;
            if (!exported.TryGetValue(table.Name, out var shape) || !names.Add(table.Name)) return false;
            if (!table.Columns.Order(StringComparer.Ordinal).SequenceEqual(
                shape.Columns.Select(c => c.Name).Order(StringComparer.Ordinal), StringComparer.Ordinal))
            {
                return false;
            }

            if (table.Rows.Any(row => row is null || row.Count != table.Columns.Count)) return false;
        }

        return names.Count == exported.Count;
    }

    private static async Task<long> WriteRowsAsync(
        NpgsqlConnection connection,
        TableShape table,
        Utf8JsonWriter json,
        CancellationToken cancellationToken)
    {
        var columns = string.Join(", ", table.Columns.Select(c => $"{Quote(c.Name)}::text"));
        await using var command = new NpgsqlCommand($"SELECT {columns} FROM {table.QuotedName}", connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        long written = 0;
        var pending = 0;
        while (await reader.ReadAsync(cancellationToken))
        {
            json.WriteStartArray();
            for (var i = 0; i < reader.FieldCount; i++)
            {
                if (reader.IsDBNull(i)) json.WriteNullValue();
                else json.WriteStringValue(reader.GetString(i));
            }

            json.WriteEndArray();
            written++;

            if (++pending == FlushEveryRows)
            {
                await json.FlushAsync(cancellationToken);
                pending = 0;
            }
        }

        return written;
    }

    private static async Task<long> InsertRowsAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        TableShape shape,
        BackupTable table,
        CancellationToken cancellationToken)
    {
        var storeTypes = shape.Columns.ToDictionary(c => c.Name, c => c.StoreType, StringComparer.Ordinal);
        var names = string.Join(", ", table.Columns!.Select(Quote));
        var values = string.Join(", ", table.Columns!.Select((column, i) => $"CAST(${i + 1} AS {storeTypes[column]})"));
        var sql = $"INSERT INTO {shape.QuotedName} ({names}) VALUES ({values})";

        foreach (var chunk in table.Rows!.Chunk(InsertBatchSize))
        {
            await using var batch = new NpgsqlBatch(connection, transaction);
            foreach (var row in chunk)
            {
                var command = new NpgsqlBatchCommand(sql);
                foreach (var value in row)
                {
                    command.Parameters.Add(new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Text, Value = (object?)value ?? DBNull.Value });
                }

                batch.BatchCommands.Add(command);
            }

            await batch.ExecuteNonQueryAsync(cancellationToken);
        }

        return table.Rows!.Count;
    }

    private static async Task SetForeignKeysAsync(
        NpgsqlConnection connection,
        IReadOnlyList<TableShape> shapes,
        string mode,
        CancellationToken cancellationToken)
    {
        foreach (var table in shapes)
        {
            foreach (var foreignKey in table.ForeignKeys)
            {
                await ExecuteAsync(
                    connection,
                    $"ALTER TABLE {table.QuotedName} ALTER CONSTRAINT {Quote(foreignKey)} {mode}",
                    cancellationToken);
            }
        }
    }

    private static async Task ResetSequencesAsync(
        NpgsqlConnection connection,
        IReadOnlyList<TableShape> shapes,
        CancellationToken cancellationToken)
    {
        var generated = new List<(string Table, string Column)>();
        await using (var command = new NpgsqlCommand(
            "SELECT table_name, column_name FROM information_schema.columns "
            + "WHERE table_schema = current_schema() AND (is_identity = 'YES' OR column_default LIKE 'nextval(%')",
            connection))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                generated.Add((reader.GetString(0), reader.GetString(1)));
            }
        }

        foreach (var (tableName, column) in generated)
        {
            var table = shapes.FirstOrDefault(t => t.Name == tableName);
            if (table is null) continue;

            await using var command = new NpgsqlCommand(
                $"SELECT setval(pg_get_serial_sequence($1, $2), COALESCE(MAX({Quote(column)}), 1), MAX({Quote(column)}) IS NOT NULL) "
                + $"FROM {table.QuotedName}",
                connection);
            command.Parameters.Add(new NpgsqlParameter { Value = table.QuotedName });
            command.Parameters.Add(new NpgsqlParameter { Value = column });
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static async Task ExecuteAsync(NpgsqlConnection connection, string sql, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task<string> CurrentMigrationAsync(CancellationToken cancellationToken) =>
        (await db.Database.GetAppliedMigrationsAsync(cancellationToken)).LastOrDefault() ?? "";

    private List<TableShape> ReadShapes()
    {
        var sessions = db.Model.FindEntityType(typeof(UserSession))!.GetTableName();

        return db.Model.GetRelationalModel().Tables
            .OrderBy(t => t.Name, StringComparer.Ordinal)
            .Select(t => new TableShape(
                t.Name,
                t.Schema is null ? Quote(t.Name) : $"{Quote(t.Schema)}.{Quote(t.Name)}",
                t.Columns.Select(c => new ColumnShape(c.Name, c.StoreType)).ToList(),
                t.ForeignKeyConstraints.Select(f => f.Name).ToList(),
                t.Name != sessions))
            .ToList();
    }

    private static string Quote(string identifier) => $"\"{identifier.Replace("\"", "\"\"")}\"";

    private sealed record TableShape(
        string Name,
        string QuotedName,
        IReadOnlyList<ColumnShape> Columns,
        IReadOnlyList<string> ForeignKeys,
        bool Exported);

    private sealed record ColumnShape(string Name, string StoreType);
}
