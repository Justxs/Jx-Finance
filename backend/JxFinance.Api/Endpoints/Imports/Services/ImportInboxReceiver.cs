using System.Security.Cryptography;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Notifications;
using JxFinance.Common.Settings;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Domain.Notifications;
using JxFinance.Endpoints.Imports.Inbox;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Endpoints.Imports.Parsing;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Imports.Services;

[RegisterService<IImportInboxReceiver>(LifeTime.Scoped)]
public sealed class ImportInboxReceiver(
    AppDbContext db,
    IInstanceSettingsStore settings,
    INotificationPublisher publisher) : IImportInboxReceiver
{
    private const int TitleMaxLength = 200;

    public async Task<string?> ReceiveAsync(InboxDrop drop, CancellationToken cancellationToken)
    {
        if (InboxRules.Problem(drop.FileName, drop.Content.Length) is { } problem)
        {
            return problem;
        }

        var sha256 = Convert.ToHexStringLower(SHA256.HashData(drop.Content));
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(AppLock.ImportInbox, cancellationToken);
        if (await db.ImportInboxFiles.IgnoreQueryFilters().AnyAsync(f => f.Sha256 == sha256, cancellationToken))
        {
            return null;
        }

        var target = await TargetAsync(drop, InboxRules.FormatOf(drop.FileName)!.Value, cancellationToken);
        if (!target.TryGetValue(out var found))
        {
            return target.Error.Message;
        }

        var (account, reader) = found;
        var file = new ImportInboxFile
        {
            UserId = account.UserId,
            AccountId = new AccountId(account.Id),
            Format = reader.Format,
            MappingId = reader.MappingId is { } mappingId ? new CsvImportMappingId(mappingId) : null,
            FileName = TextLimit.Cut(drop.FileName, ImportInboxFile.FileNameMaxLength),
            Sha256 = sha256,
            Content = drop.Content,
        };
        db.ImportInboxFiles.Add(file);
        await publisher.PreloadAsync([account.UserId], cancellationToken);
        publisher.Publish(new Notification
        {
            UserId = account.UserId,
            Type = NotificationType.ImportWaiting,
            Title = TextLimit.Ellipsize(drop.FileName, TitleMaxLength),
            RelatedType = NotificationRelated.ImportInboxFile,
            RelatedId = file.Id.Value,
            Channel = NotificationChannel.InApp,
        });
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return null;
    }

    private async Task<Result<(InboxAccount Account, InboxReader Reader)>> TargetAsync(
        InboxDrop drop,
        StatementFormat format,
        CancellationToken cancellationToken)
    {
        var accounts = await ActiveAccountsAsync(cancellationToken);
        if (format == StatementFormat.GenericCsv)
        {
            if (drop.Folder is null)
            {
                return InboxRules.Refused("A CSV file names no account. Put it in a folder named after its account's IBAN.");
            }

            var owner = InboxRules.AccountFor(drop.Folder, accounts);
            if (!owner.TryGetValue(out var csvAccount))
            {
                return owner.Error;
            }

            var reader = InboxRules.ReaderFor(
                await MappingsReadingAsync(drop.Content, csvAccount, cancellationToken),
                SwedbankCsvParser.Parse(Open(drop.Content)).IsSuccess);
            return reader.Map(chosen => (csvAccount, chosen));
        }

        var iban = drop.Folder;
        if (iban is null)
        {
            var named = await ReadAsync(format, drop.Content, null, Currency.Eur, cancellationToken);
            if (!named.TryGetValue(out var statement))
            {
                return named.Error;
            }

            iban = statement.Iban;
        }

        var matched = InboxRules.AccountFor(iban, accounts);
        if (!matched.TryGetValue(out var account))
        {
            return matched.Error;
        }

        var read = await ReadAsync(format, drop.Content, account.Iban, account.Currency, cancellationToken);
        return read.Map(_ => (account, new InboxReader(format, null)));
    }

    private async Task<IReadOnlyList<InboxReader>> MappingsReadingAsync(
        byte[] content,
        InboxAccount account,
        CancellationToken cancellationToken)
    {
        var mappings = await db.CsvImportMappings
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(m => m.UserId == account.UserId && !m.IsDeleted)
            .OrderBy(m => m.Name)
            .ToListAsync(cancellationToken);
        return mappings
            .Where(m => GenericCsvParser.Parse(Open(content), m, account.Currency).IsSuccess)
            .Select(m => new InboxReader(StatementFormat.GenericCsv, m.Id.Value, m.Name))
            .ToList();
    }

    private async Task<List<InboxAccount>> ActiveAccountsAsync(CancellationToken cancellationToken)
    {
        var activeUsers = db.Users.Where(AppUser.IsActive);
        var accounts = await db.Accounts
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(a => !a.IsDeleted && a.Iban != null && activeUsers.Any(u => u.Id == a.UserId))
            .Select(a => new { a.Id, a.UserId, a.Iban, a.StartingBalance.Currency })
            .ToListAsync(cancellationToken);
        return accounts.Select(a => new InboxAccount(a.Id.Value, a.UserId, a.Iban, a.Currency)).ToList();
    }

    private async Task<Result<ParsedStatement>> ReadAsync(
        StatementFormat format,
        byte[] content,
        string? iban,
        Currency currency,
        CancellationToken cancellationToken)
    {
        var read = await StatementReader.ReadAsync(format, Open(content), iban, currency, null, settings.Current.TimeZone, cancellationToken);
        return read.IsSuccess ? read : InboxRules.Unreadable(format, read.Error);
    }

    private static MemoryStream Open(byte[] content) => new(content, writable: false);
}
