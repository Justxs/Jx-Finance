using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.References;
using JxFinance.Common.Refunds;
using JxFinance.Common.Settings;
using JxFinance.Common.Subscriptions;
using JxFinance.Common.Transfers;
using JxFinance.Common.Trash;
using JxFinance.Common.Unusual;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Shared;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Endpoints.Imports.Confirm;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Endpoints.Imports.Matching;
using JxFinance.Endpoints.Imports.Parsing;
using JxFinance.Endpoints.Imports.Preview;
using JxFinance.Endpoints.Imports.Shared;
using JxFinance.Endpoints.Transactions.Mappers;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Imports.Services;

[RegisterService<IImportService>(LifeTime.Scoped)]
public sealed class ImportService(
    AppDbContext db,
    IExchangeRateService rates,
    ITransactionValuation valuations,
    ITransferAmountResolver transferAmounts,
    IReferenceGuard references,
    ICategorizationRuleService rules,
    IUnusualAmountService unusualAmounts,
    IInstanceSettingsStore settings,
    IReconciliationService reconciliations) : IImportService
{
    private static readonly string[] TransferKeywords =
    [
        "transfer", "pervedimas", "grynieji", "cash", "withdrawal", "easy saver", "atsiskaitom", "tarp saskaitu",
    ];

    public async Task<Result<ImportPreviewResponse>> PreviewAsync(
        StatementFormat format,
        Guid accountId,
        Stream fileStream,
        CancellationToken cancellationToken)
    {
        var typedAccountId = new AccountId(accountId);
        var accounts = await db.Accounts
            .Select(a => new { a.Id, a.Iban, a.StartingBalance.Amount, a.StartingBalance.Currency })
            .ToListAsync(cancellationToken);
        var account = accounts.Find(a => a.Id == typedAccountId);
        if (account is null)
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Account does not exist.");
        }

        var parsed = format == StatementFormat.Camt053
            ? await Camt053Parser.ParseAsync(fileStream, account.Iban, settings.Current.TimeZone, cancellationToken)
            : SwedbankCsvParser.Parse(fileStream);
        if (!parsed.TryGetValue(out var statement))
        {
            return parsed.Error;
        }

        Guid? OtherAccount(string? iban) =>
            accounts.Find(a => iban is not null && a.Iban == iban && a.Id != typedAccountId)?.Id.Value;

        var parsedRows = statement.Rows;
        var existingRefSet = await ExistingRefsAsync(typedAccountId, parsedRows.Select(r => r.ImportRef), cancellationToken);
        var duplicates = parsedRows.Select(r => !existingRefSet.Add(r.ImportRef)).ToList();
        var suggestions = await SuggestionsAsync(typedAccountId, parsedRows, cancellationToken);
        var unusualVerdicts = await UnusualAsync(typedAccountId, parsedRows, suggestions, cancellationToken);
        var matchedEntries = await ManualMatchesAsync(typedAccountId, parsedRows, duplicates, cancellationToken);
        var refundCandidates = await RefundCandidatesAsync(typedAccountId, parsedRows, duplicates, matchedEntries, cancellationToken);

        var rows = parsedRows
            .Select((r, index) => new ImportPreviewRow(
                r.ImportRef,
                r.Date,
                r.Payee,
                r.Description,
                r.Amount,
                r.Type,
                duplicates[index],
                LooksLikeTransfer(r.Payee, r.Description) || OtherAccount(r.CounterpartyIban) is not null,
                r.Currency,
                suggestions[index]?.CategoryId,
                suggestions[index]?.TagIds ?? [],
                suggestions[index]?.RuleName,
                r.IsReversal,
                OtherAccount(r.CounterpartyIban),
                unusualVerdicts[index].ToResponse(),
                matchedEntries[index],
                refundCandidates[index]))
            .ToList();

        var closing = statement.ClosingBalance;
        decimal? ledger = null;
        if (closing?.Currency == account.Currency && statement.ClosingDate is { } closingDate)
        {
            ledger = await AccountMovements.LedgerBalanceOnAsync(
                db,
                typedAccountId,
                new Money(account.Amount, account.Currency),
                closingDate,
                cancellationToken);
        }

        var matches = statement.Iban is not null && statement.Iban == account.Iban;
        return new ImportPreviewResponse(
            rows,
            new ImportStatementSummary(
                statement.Iban,
                matches,
                matches ? null : OtherAccount(statement.Iban),
                statement.NotBooked,
                statement.Unreadable,
                statement.ClosingDate,
                closing?.Amount,
                closing?.Currency,
                ledger));
    }

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
                    $"{(request.Format == StatementFormat.Camt053 ? "camt.053 XML" : "Swedbank CSV")} into {target.Name}",
                    (totals.Imported, "entry", "entries"),
                    (totals.Linked, "entry linked", "entries linked"),
                    (totals.Skipped, "duplicate skipped", "duplicates skipped")),
                totals.Imported + totals.Linked,
                accountId.Value,
                [accountId]);
        }

        await db.SaveChangesAsync(cancellationToken);

        var reconciliation = request is { Format: StatementFormat.Camt053, Statement: { } closing }
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

    private async Task<Result<ConfirmLookups>> LoadConfirmLookupsAsync(
        AccountId accountId,
        Currency accountCurrency,
        IReadOnlyList<ImportConfirmRow> rows,
        CancellationToken cancellationToken)
    {
        var existingRefs = await ExistingRefsAsync(accountId, rows.Select(r => r.ImportRef), cancellationToken);

        if (await references.TagsExistAsync(rows.SelectMany(r => r.TagIds ?? []), cancellationToken) is { } tagError)
        {
            return tagError;
        }

        var categoryIds = rows.Where(r => r.CategoryId is not null).Select(r => new CategoryId(r.CategoryId!.Value)).Distinct().ToList();
        var categoryTypes = await db.Categories
            .Where(c => categoryIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => (FlowType?)c.Type, cancellationToken);

        var otherAccountIds = rows
            .Where(r => r.TransferAccountId is not null)
            .Select(r => new AccountId(r.TransferAccountId!.Value))
            .Distinct()
            .ToList();
        var otherCurrencies = otherAccountIds.Count == 0
            ? []
            : await db.Accounts
                .Where(a => otherAccountIds.Contains(a.Id))
                .ToDictionaryAsync(a => a.Id, a => a.StartingBalance.Currency, cancellationToken);

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
            if (categoryId is { } chosen && lookups.CategoryTypes.GetValueOrDefault(chosen) != type)
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
        IReadOnlyDictionary<CategoryId, FlowType?> CategoryTypes,
        IReadOnlyDictionary<AccountId, Currency> OtherCurrencies,
        IReadOnlyDictionary<TransferId, Transfer> Candidates,
        IReadOnlySet<TransferId> AlreadyImported,
        IReadOnlyDictionary<TransactionId, Transaction> Entries,
        IReadOnlySet<TransactionId> RefundOriginals);

    private sealed record ImportTotals(int Imported, int Skipped, int Linked);

    private async Task<IReadOnlyList<ImportMatchedTransaction?>> ManualMatchesAsync(
        AccountId accountId,
        IReadOnlyList<ParsedRow> parsedRows,
        List<bool> duplicates,
        CancellationToken cancellationToken)
    {
        var lines = parsedRows
            .Select((r, index) => duplicates[index] ? null : new StatementLine(r.Date, r.Type, new Money(r.Amount, r.Currency)))
            .ToList();
        var dates = lines.OfType<StatementLine>().Select(line => line.Date).ToList();
        if (dates.Count == 0)
        {
            return lines.Select(_ => (ImportMatchedTransaction?)null).ToList();
        }

        var from = dates.Min().AddDays(-ManualEntryMatcher.MaxDays);
        var to = dates.Max().AddDays(ManualEntryMatcher.MaxDays);
        var candidates = await db.Transactions
            .Where(t => t.AccountId == accountId
                && t.Source == TransactionSource.Manual
                && t.ImportRef == null
                && t.Date >= from
                && t.Date <= to)
            .Select(t => new { t.Id, t.Date, t.Type, t.Amount.Amount, t.Amount.Currency, t.Description, t.CategoryId })
            .ToListAsync(cancellationToken);
        var byId = candidates.ToDictionary(c => c.Id);

        return ManualEntryMatcher
            .Match(lines, candidates.Select(c => new ManualEntry(c.Id, c.Date, c.Type, new Money(c.Amount, c.Currency))).ToList())
            .Select(entry => entry is null ? null : byId[entry.Id])
            .Select(found => found is null
                ? null
                : new ImportMatchedTransaction(found.Id.Value, found.Date, found.Description, found.CategoryId?.Value))
            .ToList();
    }

    private async Task<IReadOnlyList<ImportMatchedTransaction?>> RefundCandidatesAsync(
        AccountId accountId,
        IReadOnlyList<ParsedRow> parsedRows,
        List<bool> duplicates,
        IReadOnlyList<ImportMatchedTransaction?> matchedEntries,
        CancellationToken cancellationToken)
    {
        var found = new ImportMatchedTransaction?[parsedRows.Count];
        var incoming = parsedRows
            .Select((row, index) => (Row: row, Index: index))
            .Where(entry => entry.Row.Type == FlowType.Income && !duplicates[entry.Index] && matchedEntries[entry.Index] is null)
            .ToList();
        if (incoming.Count == 0)
        {
            return found;
        }

        var from = incoming.Min(entry => entry.Row.Date).AddDays(-RefundOriginal.CandidateLookBackDays);
        var to = incoming.Max(entry => entry.Row.Date);
        var purchases = (await db.Transactions
            .AsNoTracking()
            .Where(t => t.AccountId == accountId
                && t.Type == FlowType.Expense
                && t.Amount.Amount > 0
                && t.PayeeKey != null
                && t.PayeeKey != string.Empty
                && t.Date >= from
                && t.Date <= to)
            .Select(t => new { t.Id, t.Date, t.Description, t.CategoryId, t.Amount.Amount, t.Amount.Currency, t.PayeeKey, t.CreatedAt })
            .ToListAsync(cancellationToken))
            .ToLookup(t => t.PayeeKey!);

        foreach (var (row, index) in incoming)
        {
            var candidate = new[] { row.Payee, row.Description }
                .Select(SubscriptionDescription.Normalize)
                .Where(key => key.Length > 0)
                .Distinct()
                .SelectMany(key => purchases[key])
                .Where(t => t.Currency == row.Currency
                    && t.Amount >= row.Amount
                    && t.Date <= row.Date
                    && t.Date >= row.Date.AddDays(-RefundOriginal.CandidateLookBackDays))
                .OrderByDescending(t => t.Date)
                .ThenByDescending(t => t.CreatedAt)
                .FirstOrDefault();
            found[index] = candidate is null
                ? null
                : new ImportMatchedTransaction(candidate.Id.Value, candidate.Date, candidate.Description, candidate.CategoryId?.Value);
        }

        return found;
    }

    private async Task<IReadOnlyList<RuleSuggestion?>> SuggestionsAsync(
        AccountId accountId,
        IReadOnlyList<ParsedRow> parsedRows,
        CancellationToken cancellationToken)
    {
        if (!settings.Current.IsEnabled(Feature.CategorizationRules))
        {
            return parsedRows.Select(_ => (RuleSuggestion?)null).ToList();
        }

        var candidates = parsedRows
            .Select(r => new RuleCandidate(r.Description, r.Amount, r.Type))
            .ToList();

        return await rules.SuggestAsync(accountId, candidates, cancellationToken);
    }

    private async Task<IReadOnlyList<UnusualVerdict?>> UnusualAsync(
        AccountId accountId,
        IReadOnlyList<ParsedRow> parsedRows,
        IReadOnlyList<RuleSuggestion?> suggestions,
        CancellationToken cancellationToken)
    {
        var verdicts = new UnusualVerdict?[parsedRows.Count];
        var expenses = parsedRows
            .Select((row, index) => (Row: row, Index: index))
            .Where(entry => entry.Row.Type == FlowType.Expense)
            .ToList();
        if (!settings.Current.IsEnabled(Feature.UnusualAmounts) || expenses.Count == 0)
        {
            return verdicts;
        }

        if (expenses.Any(entry => entry.Row.Currency != rates.ReportingCurrency))
        {
            await rates.PreloadAsync(
                expenses.Min(entry => entry.Row.Date),
                expenses.Max(entry => entry.Row.Date),
                cancellationToken);
        }

        var candidates = new List<(int Index, UnusualCandidate Candidate)>();
        foreach (var (row, index) in expenses)
        {
            var value = await valuations.ValueAsync(accountId, row.Amount, row.Currency, row.Date, [], cancellationToken);
            if (!value.TryGetValue(out var valued))
            {
                continue;
            }

            var categoryId = suggestions[index]?.CategoryId is { } suggested ? new CategoryId(suggested) : (CategoryId?)null;
            candidates.Add((index, new UnusualCandidate(accountId, categoryId, row.Date, valued.ReportingAmount, row.Description)));
        }

        var evaluated = await unusualAmounts.EvaluateAsync(candidates.Select(c => c.Candidate).ToList(), cancellationToken);
        for (var position = 0; position < candidates.Count; position++)
        {
            verdicts[candidates[position].Index] = evaluated[position];
        }

        return verdicts;
    }

    private static bool LooksLikeTransfer(string? payee, string? description)
    {
        var text = $"{payee} {description}".ToLowerInvariant();
        return TransferKeywords.Any(text.Contains);
    }

    private async Task<HashSet<string>> ExistingRefsAsync(
        AccountId accountId,
        IEnumerable<string> refs,
        CancellationToken cancellationToken)
    {
        var importRefs = refs.ToList();
        var transactionRefs = await db.Transactions.IgnoreQueryFilters()
            .Where(t => t.AccountId == accountId && t.ImportRef != null && importRefs.Contains(t.ImportRef))
            .Select(t => t.ImportRef!)
            .ToListAsync(cancellationToken);
        var transferRefs = await db.TransferImports
            .Where(r => r.AccountId == accountId && importRefs.Contains(r.ImportRef))
            .Select(r => r.ImportRef)
            .ToListAsync(cancellationToken);
        return transactionRefs.Concat(transferRefs).ToHashSet();
    }
}
