using System.Data;
using System.IO.Compression;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Formats;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.Backups.Services;
using JxFinance.Endpoints.Transactions.ExportTransactions;
using JxFinance.Endpoints.Transactions.Mappers;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace JxFinance.Endpoints.Users.Services;

[RegisterService<IUserExportService>(LifeTime.Scoped)]
public sealed class UserExportService(
    AppDbContext db,
    AttachmentStore files,
    ICurrentUser currentUser,
    IClock clock,
    ILogger<UserExportService> logger) : IUserExportService
{
    public const string Format = "jx-finance-user-export";
    public const int Version = 1;
    public const string DataEntry = "data.json";
    public const string AccountsEntry = "accounts.csv";
    public const string TransactionsEntry = "transactions.csv";
    public const string TransfersEntry = "transfers.csv";
    public const string AccountsHeader = "Name,Type,Currency,StartingBalance,Scope,Archived";
    public const string TransfersHeader = "Date,Description,FromAccount,ToAccount,Amount,Currency,ReceivedAmount,ReceivedCurrency";

    private const string AttachmentsTable = "TransactionAttachments";

    private static readonly DomainError Busy = new(
        ErrorCodes.ConflictBusy,
        "An export of your data is already being written. Try again when it has finished.");

    public async Task<Result> WriteAsync(bool attachments, Func<string, Stream> start, CancellationToken cancellationToken)
    {
        var userId = currentUser.Id;
        var migration = BackupDatabase.CurrentMigration(db);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, cancellationToken);
        if (!await db.Database.TryLockAsync(AppLock.UserExport, userId, cancellationToken))
        {
            return Busy;
        }

        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        var attached = attachments ? await AttachmentIdsAsync(connection, userId, cancellationToken) : [];
        var present = attached.Where(files.Exists).ToList();
        var missing = attached.Count - present.Count;

        await using var output = new DeferredWriteStream(start($"jx-finance-export-{DateFormats.Iso(clock.Today)}.zip"));
        await using (var archive = await ZipArchive.CreateAsync(output, ZipArchiveMode.Create, leaveOpen: true, entryNameEncoding: null, cancellationToken))
        {
            await WriteEntryAsync(archive, DataEntry, CompressionLevel.Optimal, data => WriteDataAsync(data, connection, userId, migration, missing, cancellationToken), cancellationToken);
            var names = await LoadNamesAsync(userId, cancellationToken);
            await WriteCsvAsync(archive, AccountsEntry, AccountsHeader, AccountRowsAsync(userId, cancellationToken), cancellationToken);
            await WriteCsvAsync(archive, TransactionsEntry, TransactionCsvWriter.Header, TransactionRowsAsync(userId, names, cancellationToken), cancellationToken);
            await WriteCsvAsync(archive, TransfersEntry, TransfersHeader, TransferRowsAsync(userId, names, cancellationToken), cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            foreach (var id in present)
            {
                await using var source = files.OpenRead(id);
                await WriteEntryAsync(archive, BackupArchive.AttachmentEntry(id), CompressionLevel.NoCompression, target => source.CopyToAsync(target, cancellationToken), cancellationToken);
            }
        }

        await output.FlushAsync(cancellationToken);

        logger.LogInformation(
            "User {UserId} downloaded their data with {Attachments} attached files ({Missing} missing).",
            userId,
            present.Count,
            missing);
        return Result.Success();
    }

    private async Task WriteDataAsync(
        Stream output,
        NpgsqlConnection connection,
        Guid userId,
        string migration,
        int missing,
        CancellationToken cancellationToken)
    {
        await using var json = new Utf8JsonWriter(output);
        json.WriteStartObject();
        json.WriteString(BackupJsonNames.Format, Format);
        json.WriteNumber(BackupJsonNames.Version, Version);
        json.WriteString(BackupJsonNames.CreatedAt, clock.UtcNow);
        json.WriteString(BackupJsonNames.Migration, migration);
        json.WriteString(BackupJsonNames.UserId, userId);
        json.WriteNumber(BackupJsonNames.MissingAttachments, missing);
        json.WriteStartArray(BackupJsonNames.Tables);

        foreach (var table in BackupDatabase.ReadShapes(db))
        {
            if (UserExportTables.Condition(table.Name) is not { } condition)
            {
                continue;
            }

            var rule = UserExportTables.Rules[table.Name];
            var exported = table with { Columns = table.Columns.Where(c => rule.Exports(c.Name)).ToList() };
            await BackupDatabase.WriteTableAsync(connection, exported, json, condition, [UserParameter(userId)], cancellationToken);
        }

        json.WriteEndArray();
        json.WriteEndObject();
        await json.FlushAsync(cancellationToken);
    }

    private static async Task<List<Guid>> AttachmentIdsAsync(NpgsqlConnection connection, Guid userId, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(
            $"SELECT {BackupDatabase.Quote("Id")} FROM {BackupDatabase.Quote(AttachmentsTable)} WHERE {UserExportTables.Condition(AttachmentsTable)}",
            connection);
        command.Parameters.Add(UserParameter(userId));
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var ids = new List<Guid>();
        while (await reader.ReadAsync(cancellationToken))
        {
            ids.Add(reader.GetGuid(0));
        }

        return ids;
    }

    private static async Task WriteEntryAsync(
        ZipArchive archive,
        string name,
        CompressionLevel compression,
        Func<Stream, Task> write,
        CancellationToken cancellationToken)
    {
        await using var entry = await archive.CreateEntry(name, compression).OpenAsync(cancellationToken);
        await write(entry);
    }

    private static Task WriteCsvAsync(
        ZipArchive archive,
        string name,
        string header,
        IAsyncEnumerable<string> rows,
        CancellationToken cancellationToken) =>
        WriteEntryAsync(
            archive,
            name,
            CompressionLevel.Optimal,
            async entry =>
            {
                await using var writer = new StreamWriter(entry, new UTF8Encoding(false), leaveOpen: true);
                await writer.WriteLineAsync(header);
                await foreach (var row in rows)
                {
                    await writer.WriteLineAsync(row);
                }
            },
            cancellationToken);

    private async IAsyncEnumerable<string> AccountRowsAsync(Guid userId, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var accounts = db.Accounts
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderBy(a => a.Name)
            .ThenBy(a => a.CreatedAt)
            .AsAsyncEnumerable();
        await foreach (var account in accounts.WithCancellation(cancellationToken))
        {
            yield return CsvCell.Row(
                CsvCell.Text(account.Name),
                CsvCell.Value(account.Type.ToString()),
                CsvCell.Value(account.Currency.ToCode()),
                CsvCell.Money(account.StartingBalance.Amount),
                CsvCell.Value(account.Scope.ToString()),
                CsvCell.Value(account.IsDeleted ? "true" : "false"));
        }
    }

    private async IAsyncEnumerable<string> TransactionRowsAsync(
        Guid userId,
        ExportNames names,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var transactions = LiveTransactions(userId);
        var tags = (await db.TransactionTags
                .Where(x => transactions.Any(t => t.Id == x.TransactionId))
                .ToListAsync(cancellationToken))
            .GroupBy(x => x.TransactionId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.TagId).ToList());

        var rows = transactions
            .AsNoTracking()
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .AsAsyncEnumerable();
        await foreach (var transaction in rows.WithCancellation(cancellationToken))
        {
            yield return TransactionCsvWriter.Row(transaction.ToResponse(null, tags.GetValueOrDefault(transaction.Id)), names);
        }
    }

    private async IAsyncEnumerable<string> TransferRowsAsync(
        Guid userId,
        ExportNames names,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var rows = LiveTransfers(userId)
            .AsNoTracking()
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .AsAsyncEnumerable();
        await foreach (var transfer in rows.WithCancellation(cancellationToken))
        {
            yield return CsvCell.Row(
                CsvCell.Date(transfer.Date),
                CsvCell.Text(transfer.Description),
                CsvCell.Text(names.Accounts.GetValueOrDefault(transfer.FromAccountId.Value)),
                CsvCell.Text(names.Accounts.GetValueOrDefault(transfer.ToAccountId.Value)),
                CsvCell.Money(transfer.Amount.Amount),
                CsvCell.Value(transfer.Amount.Currency.ToCode()),
                CsvCell.Money(transfer.ReceivedAmount.Amount),
                CsvCell.Value(transfer.ReceivedAmount.Currency.ToCode()));
        }
    }

    private async Task<ExportNames> LoadNamesAsync(Guid userId, CancellationToken cancellationToken)
    {
        var transactions = LiveTransactions(userId);
        var transfers = LiveTransfers(userId);

        var accounts = await db.Accounts
            .IgnoreQueryFilters()
            .Where(a => a.UserId == userId || transfers.Any(t => t.FromAccountId == a.Id || t.ToAccountId == a.Id))
            .Select(a => new { a.Id, a.Name })
            .ToListAsync(cancellationToken);
        var categories = await db.Categories
            .IgnoreQueryFilters()
            .Where(c => transactions.Any(t => t.CategoryId == c.Id))
            .Select(c => new { c.Id, c.Name })
            .ToListAsync(cancellationToken);
        var tags = await db.Tags
            .IgnoreQueryFilters()
            .Where(tag => db.TransactionTags.Any(x => x.TagId == tag.Id && transactions.Any(t => t.Id == x.TransactionId)))
            .Select(tag => new { tag.Id, tag.Name })
            .ToListAsync(cancellationToken);

        return new ExportNames(
            accounts.ToDictionary(a => a.Id.Value, a => a.Name),
            categories.ToDictionary(c => c.Id.Value, c => c.Name),
            tags.ToDictionary(t => t.Id.Value, t => t.Name));
    }

    private IQueryable<AccountId> LiveOwnAccounts(Guid userId) =>
        db.Accounts.IgnoreQueryFilters(QueryFilters.OwnerOnly).Where(a => a.UserId == userId).Select(a => a.Id);

    private IQueryable<Transaction> LiveTransactions(Guid userId)
    {
        var accounts = LiveOwnAccounts(userId);
        return db.Transactions.IgnoreQueryFilters(QueryFilters.OwnerOnly).Where(t => accounts.Contains(t.AccountId));
    }

    private IQueryable<Transfer> LiveTransfers(Guid userId)
    {
        var accounts = LiveOwnAccounts(userId);
        return db.Transfers
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(t => accounts.Contains(t.FromAccountId) || accounts.Contains(t.ToAccountId));
    }

    private static NpgsqlParameter UserParameter(Guid userId) => new() { Value = userId };
}
