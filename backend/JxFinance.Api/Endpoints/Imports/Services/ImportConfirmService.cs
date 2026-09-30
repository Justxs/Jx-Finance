using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.References;
using JxFinance.Common.Refunds;
using JxFinance.Common.Transfers;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Imports.Confirm;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Endpoints.Imports.Matching;
using JxFinance.Endpoints.Imports.Parsing;
using JxFinance.Endpoints.Transactions.Mappers;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Imports.Services;

[RegisterService<IImportConfirmService>(LifeTime.Scoped)]
public sealed class ImportConfirmService(
    AppDbContext db,
    IExchangeRateService rates,
    ITransactionValuation valuations,
    ITransferAmountResolver transferAmounts,
    IReferenceGuard references,
    IReconciliationService reconciliations) : IImportConfirmService
{
    public async Task<Result<ImportConfirmResponse>> ConfirmAsync(
        ImportConfirmRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(request.AccountId, cancellationToken);
        var accountId = new AccountId(request.AccountId);
        var target = await db.Accounts
            .Where(a => a.Id == accountId)
            .Select(a => new { Currency = (Currency?)a.StartingBalance.Currency, a.Name })
            .FirstOrDefaultAsync(cancellationToken);
        var accountCurrency = target?.Currency;
        if (target is null || accountCurrency is null)
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Account does not exist.");
        }

        var loaded = await LoadConfirmLookupsAsync(accountId, accountCurrency.Value, request.Rows, cancellationToken);
        if (!loaded.TryGetValue(out var lookups))
        {
            return loaded.Error;
        }

        var counted = await AddRowsAsync(accountId, accountCurrency.Value, request.Rows, lookups, cancellationToken);
        if (!counted.TryGetValue(out var totals))
        {
            return counted.Error;
        }

        if (totals.Imported + totals.Linked > 0)
        {
            db.Audit.Summarise(
                AuditAction.Imported,
                AuditEntityKind.Transaction,
                TrashLabel.Counted(
                    $"{await FormatLabelAsync(request, cancellationToken)} into {target.Name}",
                    (totals.Imported, "entry", "entries"),
                    (totals.Linked, "entry linked", "entries linked"),
                    (totals.Skipped, "duplicate skipped", "duplicates skipped")),
                totals.Imported + totals.Linked,
                accountId.Value,
                [accountId]);
        }

        await db.SaveChangesAsync(cancellationToken);

        var reconciliation = request is { Format: StatementFormat.Camt053 or StatementFormat.GenericCsv, Statement: { } closing }
            && closing.ClosingCurrency == accountCurrency
                ? (await reconciliations.RecordAsync(
                    request.AccountId,
                    closing.ClosingDate,
                    closing.ClosingBalance,
                    ReconciliationSource.Statement,
                    cancellationToken)).Value
                : null;

        await transaction.CommitAsync(cancellationToken);
        return new ImportConfirmResponse(totals.Imported, totals.Skipped, totals.Linked, reconciliation);
    }

    private async Task<string> FormatLabelAsync(ImportConfirmRequest request, CancellationToken cancellationToken) => request.Format switch
    {
        StatementFormat.Camt053 => "camt.053 XML",
        StatementFormat.GenericCsv => $"{(await ImportQueries.FindMappingAsync(db, request.MappingId, cancellationToken))?.Name ?? "Mapped"} CSV",
        _ => "Swedbank CSV",
    };

    private async Task<Result<ConfirmLookups>> LoadConfirmLookupsAsync(
        AccountId accountId,
        Currency accountCurrency,
        IReadOnlyList<ImportConfirmRow> rows,
        CancellationToken cancellationToken)
    {
        var existingRefs = await ImportQueries.ExistingRefsAsync(db, accountId, rows.Select(r => r.ImportRef), cancellationToken);

        if (await references.TagsExistAsync(rows.SelectMany(r => r.TagIds ?? []), cancellationToken) is { } tagError)
        {
            return tagError;
        }

        var categoryTypes = await references.CategoryTypesAsync(
            rows.Select(r => r.CategoryId is { } id ? new CategoryId(id) : (CategoryId?)null),
            cancellationToken);

        var otherAccountIds = rows
            .Where(r => r.TransferAccountId is not null)
            .Select(r => new AccountId(r.TransferAccountId!.Value))
            .Distinct()
            .ToList();
        var otherCurrencies = otherAccountIds.Count == 0
            ? []
            : await db.Accounts
                .Where(a => otherAccountIds.Contains(a.Id))
                .Select(a => new { Key = a.Id, Value = a.StartingBalance.Currency })
                .ToDictionaryAsync(x => x.Key, x => x.Value, cancellationToken);

        var wantedTransferIds = rows
            .Where(r => r.ExistingTransferId is not null)
            .Select(r => new TransferId(r.ExistingTransferId!.Value))
            .Distinct()
            .ToList();
        var candidates = wantedTransferIds.Count == 0
            ? []
            : await db.Transfers
                .Where(t => wantedTransferIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, cancellationToken);
        var alreadyImported = wantedTransferIds.Count == 0
            ? []
            : (await db.TransferImports
                .Where(r => r.AccountId == accountId && wantedTransferIds.Contains(r.TransferId))
                .Select(r => r.TransferId)
                .ToListAsync(cancellationToken)).ToHashSet();

        var entryIds = rows
            .Where(r => r.ExistingTransactionId is not null)
            .Select(r => new TransactionId(r.ExistingTransactionId!.Value))
            .Distinct()
            .ToList();
        var entries = entryIds.Count == 0
            ? []
            : await db.Transactions
                .Where(t => entryIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, cancellationToken);

        var refundOriginals = await RefundOriginal.ValidAsync(
            db.Transactions,
            rows.Select(r => r.RefundOfTransactionId).OfType<Guid>().Distinct().Select(id => new TransactionId(id)).ToList(),
            cancellationToken);

        await PreloadRatesAsync(accountCurrency, rows, cancellationToken);

        return new ConfirmLookups(existingRefs, categoryTypes, otherCurrencies, candidates, alreadyImported, entries, refundOriginals);
    }

    private async Task PreloadRatesAsync(
        Currency accountCurrency,
        IReadOnlyList<ImportConfirmRow> rows,
        CancellationToken cancellationToken)
    {
        var converted = rows
            .Where(r => r.TransferAccountId is null
                && r.ExistingTransactionId is null
                && (r.Currency ?? accountCurrency) != rates.ReportingCurrency)
            .Select(r => r.Date)
            .ToList();
        if (converted.Count > 0)
        {
            await rates.PreloadAsync(converted.Min(), converted.Max(), cancellationToken);
        }
    }

    private async Task<Result<ImportTotals>> AddRowsAsync(
        AccountId accountId,
        Currency accountCurrency,
        IReadOnlyList<ImportConfirmRow> rows,
        ConfirmLookups lookups,
        CancellationToken cancellationToken)
    {
        var imported = 0;
        var skipped = 0;
        var linked = 0;
        var matchedTransfers = new HashSet<TransferId>();

        foreach (var row in rows)
        {
            if (!lookups.ExistingRefs.Add(row.ImportRef))
            {
                skipped++;
                continue;
            }

            var currency = row.Currency ?? accountCurrency;
            if (row.ExistingTransactionId is { } entryId)
            {
                if (LinkEntry(accountId, row, currency, lookups.Entries.GetValueOrDefault(new TransactionId(entryId))) is { } linkError)
                {
                    return linkError;
                }

                linked++;
                continue;
            }

            var type = row.AsRefund ? FlowType.Expense : row.Type;
            var categoryId = row.CategoryId is { } id ? new CategoryId(id) : (CategoryId?)null;
            if (categoryId is { } chosen && (!lookups.CategoryTypes.TryGetValue(chosen, out var chosenType) || chosenType != type))
            {
                return new DomainError(ErrorCodes.CategoryWrongType, "Category does not exist or has the wrong type.");
            }

            if (row.TransferAccountId is not null)
            {
                var matched = AddTransfer(accountId, accountCurrency, row, currency, lookups, matchedTransfers);
                if (matched is { } transferError)
                {
                    return transferError;
                }

                imported++;
                continue;
            }

            if (row.ExistingTransferId is not null)
            {
                return new DomainError(ErrorCodes.Required, "Choose the other account before matching a transfer.");
            }

            var refundOf = row.RefundOfTransactionId is { } originalId ? new TransactionId(originalId) : (TransactionId?)null;
            if (refundOf is { } original && !lookups.RefundOriginals.Contains(original))
            {
                return RefundOriginal.Invalid;
            }

            var value = await valuations.ValueAsync(accountId, row.AsRefund ? -row.Amount : row.Amount, currency, row.Date, [], cancellationToken);
            if (!value.TryGetValue(out var valued))
            {
                return value.Error;
            }

            var created = new Transaction
            {
                AccountId = accountId,
                CategoryId = categoryId,
                Type = type,
                RefundOfTransactionId = refundOf,
                Amount = valued.Amount,
                ReportingAmount = valued.ReportingAmount,
                Date = row.Date,
                Description = OptionalText.Normalize(row.Description),
                Source = TransactionSource.Imported,
                ImportRef = row.ImportRef,
            };
            db.Transactions.Add(created);
            db.TransactionTags.AddRange(row.TagIds.ToTransactionTags(created.Id));
            imported++;
        }

        return new ImportTotals(imported, skipped, linked);
    }

    private static DomainError? LinkEntry(AccountId accountId, ImportConfirmRow row, Currency currency, Transaction? entry)
    {
        if (row.TransferAccountId is not null
            || entry is null
            || entry.AccountId != accountId
            || entry.Source != TransactionSource.Manual
            || entry.ImportRef is not null
            || !new ManualEntry(entry.Id, entry.Date, entry.Type, entry.Amount).Fits(new StatementLine(row.Date, row.Type, new Money(row.Amount, currency))))
        {
            return new DomainError(
                ErrorCodes.ImportEntryMismatch,
                "The chosen entry does not match this bank entry or is already linked to another.");
        }

        entry.ImportRef = row.ImportRef;
        entry.Source = TransactionSource.Imported;
        return null;
    }

    private DomainError? AddTransfer(
        AccountId accountId,
        Currency accountCurrency,
        ImportConfirmRow row,
        Currency currency,
        ConfirmLookups lookups,
        HashSet<TransferId> matchedTransfers)
    {
        var otherAccountId = new AccountId(row.TransferAccountId!.Value);
        if (otherAccountId == accountId || !lookups.OtherCurrencies.TryGetValue(otherAccountId, out var otherCurrency))
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Choose another accessible account for the transfer.");
        }

        var amount = new Money(row.Amount, currency);
        var fromId = row.Type == FlowType.Expense ? accountId : otherAccountId;
        var toId = row.Type == FlowType.Expense ? otherAccountId : accountId;
        Transfer transfer;
        if (row.ExistingTransferId is { } existingId)
        {
            var transferId = new TransferId(existingId);
            if (!lookups.Candidates.TryGetValue(transferId, out var match)
                || match.FromAccountId != fromId || match.ToAccountId != toId
                || (row.Type == FlowType.Expense ? match.Amount : match.ReceivedAmount) != amount || match.Date != row.Date)
            {
                return new DomainError(ErrorCodes.ImportTransferMismatch, "The selected transfer does not match this bank entry.");
            }

            if (!matchedTransfers.Add(match.Id) || lookups.AlreadyImported.Contains(match.Id))
            {
                return new DomainError(
                    ErrorCodes.ImportTransferAlreadyMatched,
                    "The selected transfer is already matched to another bank entry of this account.");
            }

            transfer = match;
        }
        else
        {
            var draft = row.Type == FlowType.Expense
                ? new TransferDraft(fromId, toId, row.Amount, currency, null, otherCurrency)
                : new TransferDraft(fromId, toId, row.Amount, otherCurrency, null, currency);
            var amounts = transferAmounts.Resolve(
                draft,
                row.Type == FlowType.Expense ? accountCurrency : otherCurrency,
                row.Type == FlowType.Expense ? otherCurrency : accountCurrency,
                []);
            if (!amounts.TryGetValue(out var resolved))
            {
                return amounts.Error.Code == ErrorCodes.TransferReceivedAmountRequired
                    ? new DomainError(
                        ErrorCodes.TransferReceivedAmountRequired,
                        "The other account holds a different currency. Record this transfer under Transfers with the received amount.")
                    : amounts.Error;
            }

            transfer = new Transfer
            {
                FromAccountId = fromId,
                ToAccountId = toId,
                Amount = resolved.Sent,
                ReceivedAmount = resolved.Received,
                Date = row.Date,
                Description = OptionalText.Normalize(row.Description),
            };
            db.Transfers.Add(transfer);
        }

        db.TransferImports.Add(new TransferImport { AccountId = accountId, ImportRef = row.ImportRef, TransferId = transfer.Id });
        return null;
    }

    private sealed record ConfirmLookups(
        HashSet<string> ExistingRefs,
        IReadOnlyDictionary<CategoryId, FlowType> CategoryTypes,
        IReadOnlyDictionary<AccountId, Currency> OtherCurrencies,
        IReadOnlyDictionary<TransferId, Transfer> Candidates,
        IReadOnlySet<TransferId> AlreadyImported,
        IReadOnlyDictionary<TransactionId, Transaction> Entries,
        IReadOnlySet<TransactionId> RefundOriginals);

    private sealed record ImportTotals(int Imported, int Skipped, int Linked);
}
