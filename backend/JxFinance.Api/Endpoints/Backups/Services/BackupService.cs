using System.Data;
using System.IO.Compression;
using System.Text.Json;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.RestoreBackup;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Infrastructure.Backups;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace JxFinance.Endpoints.Backups.Services;

[RegisterService<IBackupService>(LifeTime.Scoped)]
public sealed class BackupService(
    AppDbContext db,
    BackupStore backups,
    IInstanceSettingsStore store,
    IClock clock,
    IAuthService authService,
    ICurrentUser currentUser,
    IOptions<AppOptions> options,
    ILogger<BackupService> logger) : IBackupService
{
    public const string Format = "jx-finance-backup";
    public const int Version = 1;

    private const int FlushEveryRows = 1000;

    private static readonly DomainError NotFound = new(ErrorCodes.ResourceNotFound, "The backup does not exist.");

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
                return new StoredBackup(id, createdAt, OptionalText.Normalize(note), migration, tables, rows, Uploaded: false);
            },
            cancellationToken);

        logger.LogInformation("Backup {BackupId} created: {Rows} rows, {Size} bytes.", id, stored.Rows, stored.SizeBytes);
        return ToResponse(stored, migration);
    }

    public async Task<Result<BackupResponse>> UploadAsync(Stream input, string? note, CancellationToken cancellationToken)
    {
        var compressed = await IsCompressedAsync(input, cancellationToken);
        var inspector = new BackupInspector();
        if (await ReadAsync(input, compressed, inspector, cancellationToken) is { } failure)
        {
            return failure;
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
                    inspector.Header!.CreatedAt,
                    OptionalText.Normalize(note),
                    inspector.Header.Migration ?? "",
                    inspector.Tables,
                    inspector.Rows,
                    Uploaded: true);
            },
            cancellationToken);

        return ToResponse(stored, await CurrentMigrationAsync(cancellationToken));
    }

    public async Task<Result<BackupResponse>> UpdateAsync(Guid id, string? note, CancellationToken cancellationToken)
    {
        if (await backups.FindAsync(id, cancellationToken) is not { } stored)
        {
            return NotFound;
        }

        var updated = stored with { Note = OptionalText.Normalize(note) };
        await backups.SaveAsync(updated, cancellationToken);
        return ToResponse(updated, await CurrentMigrationAsync(cancellationToken));
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        if (await backups.FindAsync(id, cancellationToken) is null)
        {
            return NotFound;
        }

        backups.Delete(id);
        logger.LogInformation("Backup {BackupId} deleted.", id);
        return Result.Success();
    }

    public async Task<Result<BackupDownload>> OpenAsync(Guid id, CancellationToken cancellationToken)
    {
        if (await backups.FindAsync(id, cancellationToken) is not { } stored)
        {
            return NotFound;
        }

        return new BackupDownload(
            backups.OpenRead(id),
            $"jx-finance-backup-{stored.CreatedAt.UtcDateTime:yyyyMMdd-HHmmss}.json.gz",
            stored.SizeBytes);
    }

    public async Task<Result<RestoreBackupResponse>> RestoreAsync(Guid id, string password, CancellationToken cancellationToken)
    {
        if (await authService.FindByIdAsync(currentUser.Id, cancellationToken) is not { } administrator)
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Only administrators can restore a backup.");
        }

        var confirmed = await authService.ConfirmPasswordAsync(administrator, password, ErrorCodes.PasswordIncorrect);
        if (confirmed.IsFailure)
        {
            return confirmed.Error;
        }

        if (await backups.FindAsync(id, cancellationToken) is null)
        {
            return NotFound;
        }

        await using var stream = backups.OpenRead(id);
        return await RestoreAsync(stream, cancellationToken);
    }

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
        var tables = BackupDatabase.ReadShapes(db).Where(t => t.Exported).ToList();

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
        var compressed = await IsCompressedAsync(input, cancellationToken);
        var migration = await CurrentMigrationAsync(cancellationToken);
        await using var restorer = new BackupRestorer(db, BackupDatabase.ReadShapes(db), migration, options.Value.BackupLockTimeoutSeconds);

        try
        {
            if (await ReadAsync(input, compressed, restorer, cancellationToken) is { } failure)
            {
                return failure;
            }

            await restorer.CompleteAsync(cancellationToken);
        }
        catch (BackupFileException ex)
        {
            return new DomainError(ex.Code, ex.Message);
        }
        catch (PostgresException ex) when (ex.SqlState.StartsWith("22", StringComparison.Ordinal)
            || ex.SqlState.StartsWith("23", StringComparison.Ordinal))
        {
            logger.LogWarning(ex, "Backup restore was rolled back because the file holds data the database rejects.");
            return new DomainError(
                ErrorCodes.BackupInvalidFile,
                "The backup holds data the database rejects. Nothing was changed.");
        }
        catch (PostgresException ex) when (ex.SqlState is PostgresErrorCodes.LockNotAvailable
            or PostgresErrorCodes.DeadlockDetected
            or PostgresErrorCodes.SerializationFailure)
        {
            logger.LogWarning(ex, "Backup restore was rolled back because the database was busy.");
            return new DomainError(
                ErrorCodes.ConflictBusy,
                "The database was busy with other work. Nothing was changed; try again in a moment.");
        }

        var header = restorer.Header!;
        db.ChangeTracker.Clear();
        store.Set(await db.InstanceSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken) ?? store.Defaults());
        logger.LogWarning(
            "Installation restored from a backup taken at {CreatedAt}: {Tables} tables, {Rows} rows.",
            header.CreatedAt,
            restorer.Tables,
            restorer.Rows);

        return new RestoreBackupResponse(header.CreatedAt, restorer.Tables, restorer.Rows);
    }

    private static async Task<bool> IsCompressedAsync(Stream input, CancellationToken cancellationToken)
    {
        var magic = new byte[2];
        var read = await input.ReadAtLeastAsync(magic, 2, throwOnEndOfStream: false, cancellationToken);
        input.Position = 0;
        return read == 2 && magic[0] == 0x1f && magic[1] == 0x8b;
    }

    public static void EnsureSupported(BackupHeader header)
    {
        if (header.Format != Format || header.Version != Version) throw new BackupFileException();
    }

    private async Task<DomainError?> ReadAsync(
        Stream input,
        bool compressed,
        IBackupVisitor visitor,
        CancellationToken cancellationToken)
    {
        var maximumBytes = options.Value.BackupMaxDecompressedBytes;
        try
        {
            await using var gzip = compressed ? new GZipStream(input, CompressionMode.Decompress, leaveOpen: true) : null;
            await using var limited = new LimitedReadStream(gzip ?? input, maximumBytes);
            await new BackupReader(visitor).ReadAsync(limited, cancellationToken);
            return null;
        }
        catch (BackupTooLargeException)
        {
            return new DomainError(
                ErrorCodes.BackupTooLarge,
                $"The backup holds more than {maximumBytes / (1024 * 1024)} MB of data once decompressed.");
        }
        catch (BackupFileException ex)
        {
            return new DomainError(ex.Code, ex.Message);
        }
        catch (Exception ex) when (ex is JsonException or InvalidDataException)
        {
            return new DomainError(ErrorCodes.BackupInvalidFile, "The file is not a Jx Finance backup.");
        }
    }

    private static async Task<long> WriteRowsAsync(
        NpgsqlConnection connection,
        TableShape table,
        Utf8JsonWriter json,
        CancellationToken cancellationToken)
    {
        var columns = string.Join(", ", table.Columns.Select(c => $"{BackupDatabase.Quote(c.Name)}::text"));
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

    private async Task<string> CurrentMigrationAsync(CancellationToken cancellationToken) =>
        (await db.Database.GetAppliedMigrationsAsync(cancellationToken)).LastOrDefault() ?? "";
}
