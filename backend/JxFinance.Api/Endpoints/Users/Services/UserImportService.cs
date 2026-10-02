using System.IO.Compression;
using System.Text.Json;
using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Backups.Services;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Endpoints.Users.ImportMyData;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.Backups;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace JxFinance.Endpoints.Users.Services;

[RegisterService<IUserImportService>(LifeTime.Scoped)]
public sealed class UserImportService(
    AppDbContext db,
    AttachmentStore files,
    ICurrentUser currentUser,
    IOptions<AppOptions> options,
    ILogger<UserImportService> logger) : IUserImportService
{
    private const string NotAnExport = "The file is not a Jx Finance data export.";

    private static readonly DomainError TargetNotEmpty = new(
        ErrorCodes.ImportTargetNotEmpty,
        "Your ledger already has accounts or tags. Import your data into a new, empty member instead.");

    public async Task<Result<ImportMyDataResponse>> ImportAsync(Stream input, CancellationToken cancellationToken)
    {
        var userId = currentUser.Id;
        if (await HasDataAsync(userId, cancellationToken))
        {
            return TargetNotEmpty;
        }

        if (await BackupArchive.DetectAsync(input, cancellationToken) != BackupContainer.Zip)
        {
            return new DomainError(ErrorCodes.ImportInvalidFile, NotAnExport);
        }

        await using var import = new MemberImport(db, userId, options.Value.BackupLockTimeoutSeconds);
        using var staging = files.BeginStaging();
        int removed;
        try
        {
            await using var archive = await ZipArchive.CreateAsync(input, ZipArchiveMode.Read, leaveOpen: true, entryNameEncoding: null, cancellationToken);
            var data = archive.GetEntry(UserExportService.DataEntry) ?? throw new BackupFileException(ErrorCodes.ImportInvalidFile, NotAnExport);
            await using (var document = await data.OpenAsync(cancellationToken))
            await using (var limited = new LimitedReadStream(document, options.Value.BackupMaxDecompressedBytes))
            {
                await new BackupReader(import).ReadAsync(limited, cancellationToken);
            }

            var withoutFile = await StageAsync(archive, import.Attachments, staging, cancellationToken);
            removed = await import.RepairAsync(withoutFile, cancellationToken);
            await import.CompleteAsync(cancellationToken);
        }
        catch (BackupFileException ex)
        {
            return ex.Code == ErrorCodes.BackupInvalidFile ? new DomainError(ErrorCodes.ImportInvalidFile, NotAnExport) : new DomainError(ex.Code, ex.Message);
        }
        catch (BackupTooLargeException)
        {
            return new DomainError(
                ErrorCodes.BackupTooLarge,
                $"The export holds more than {options.Value.BackupMaxDecompressedBytes / (1024 * 1024)} MB of data once decompressed.");
        }
        catch (AttachmentTooLargeException)
        {
            return new DomainError(ErrorCodes.ImportInvalidFile, "A file in the export is larger than an attachment can be.");
        }
        catch (Exception ex) when (ex is JsonException or InvalidDataException)
        {
            return new DomainError(ErrorCodes.ImportInvalidFile, NotAnExport);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            logger.LogWarning(ex, "Data import for user {UserId} was rolled back because its records already exist.", userId);
            return new DomainError(
                ErrorCodes.ImportAlreadyPresent,
                "Some of these records already exist in this installation. Nothing was changed.");
        }
        catch (PostgresException ex) when (ex.SqlState.StartsWith("22", StringComparison.Ordinal)
            || ex.SqlState.StartsWith("23", StringComparison.Ordinal))
        {
            logger.LogWarning(ex, "Data import for user {UserId} was rolled back because the file holds data the database rejects.", userId);
            return new DomainError(ErrorCodes.ImportInvalidFile, "The export holds data the database rejects. Nothing was changed.");
        }
        catch (PostgresException ex) when (ex.SqlState is PostgresErrorCodes.LockNotAvailable
            or PostgresErrorCodes.DeadlockDetected
            or PostgresErrorCodes.SerializationFailure)
        {
            logger.LogWarning(ex, "Data import for user {UserId} was rolled back because the database was busy.", userId);
            return new DomainError(
                ErrorCodes.ConflictBusy,
                "The database was busy with other work. Nothing was changed; try again in a moment.");
        }

        var attachments = staging.Publish();
        db.ChangeTracker.Clear();
        logger.LogInformation(
            "User {UserId} imported their data: {Tables} tables, {Rows} rows, {Attachments} files, {Removed} records dropped.",
            userId,
            import.Tables,
            import.Rows,
            attachments,
            removed);
        return new ImportMyDataResponse(import.Tables, import.Rows, attachments, removed);
    }

    private async Task<bool> HasDataAsync(Guid userId, CancellationToken cancellationToken) =>
        await db.Accounts.IgnoreQueryFilters(QueryFilters.OwnerOnly).AnyAsync(a => a.UserId == userId, cancellationToken)
        || await db.Tags.IgnoreQueryFilters(QueryFilters.OwnerOnly).AnyAsync(t => t.UserId == userId, cancellationToken);

    private static async Task<List<Guid>> StageAsync(
        ZipArchive archive,
        IReadOnlyList<(Guid Id, string Sha256)> attachments,
        AttachmentStaging staging,
        CancellationToken cancellationToken)
    {
        var withoutFile = new List<Guid>();
        foreach (var (id, sha256) in attachments)
        {
            if (archive.GetEntry(BackupArchive.AttachmentEntry(id)) is not { } entry)
            {
                withoutFile.Add(id);
                continue;
            }

            await using var content = await entry.OpenAsync(cancellationToken);
            var staged = await staging.AddAsync(id, content, TransactionAttachment.MaxFileBytes, cancellationToken);
            if (!string.Equals(staged.Sha256, sha256, StringComparison.OrdinalIgnoreCase))
            {
                throw new BackupFileException(
                    ErrorCodes.ImportInvalidFile,
                    "A file in the export does not match the checksum recorded for it. Nothing was changed.");
            }
        }

        return withoutFile;
    }
}
