using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.References;
using JxFinance.Common.Settings;
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
using JxFinance.Endpoints.Accounts.Shared;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Endpoints.Imports.Confirm;
using JxFinance.Endpoints.Imports.Interfaces;
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
    IInstanceSettingsStore settings) : IImportService
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
        var suggestions = await SuggestionsAsync(typedAccountId, parsedRows, cancellationToken);
        var unusualVerdicts = await UnusualAsync(typedAccountId, parsedRows, suggestions, cancellationToken);

        var rows = parsedRows
            .Select((r, index) => new ImportPreviewRow(
                r.ImportRef,
                r.Date,
                r.Payee,
                r.Description,
                r.Amount,
                r.Type,
                !existingRefSet.Add(r.ImportRef),
                LooksLikeTransfer(r.Payee, r.Description) || OtherAccount(r.CounterpartyIban) is not null,
                r.Currency,
                suggestions[index]?.CategoryId,
                suggestions[index]?.TagIds ?? [],
                suggestions[index]?.RuleName,
                r.IsReversal,
                OtherAccount(r.CounterpartyIban),
                unusualVerdicts[index].ToResponse()))
            .ToList();

        var closing = statement.ClosingBalance;
        decimal? ledger = null;
        if (closing?.Currency == account.Currency && statement.ClosingDate is { } closingDate)
        {
            var moved = await AccountMovements.SumAsync(db, [typedAccountId], closingDate, cancellationToken);
            ledger = account.Amount + moved.Where(m => m.Currency == account.Currency).Sum(m => m.Amount);
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

        if (totals.Imported > 0)
        {
            db.Audit.Summarise(
                AuditAction.Imported,
                AuditEntityKind.Transaction,
                TrashLabel.Counted(
                    $"{(request.Format == StatementFormat.Camt053 ? "camt.053 XML" : "Swedbank CSV")} into {target.Name}",
                    (totals.Imported, "entry", "entries"),
                    (totals.Skipped, "duplicate skipped", "duplicates skipped")),
                totals.Imported,
                accountId.Value,
                [accountId]);
        }

        await db.SaveChangesAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return new ImportConfirmResponse(totals.Imported, totals.Skipped);
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

        await PreloadRatesAsync(accountCurrency, rows, cancellationToken);

        return new ConfirmLookups(existingRefs, categoryTypes, otherCurrencies, candidates, alreadyImported);
    }

    private async Task PreloadRatesAsync(
        Currency accountCurrency,
        IReadOnlyList<ImportConfirmRow> rows,
        CancellationToken cancellationToken)
    {
        var converted = rows
            .Where(r => r.TransferAccountId is null && (r.Currency ?? accountCurrency) != rates.ReportingCurrency)
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
        var matchedTransfers = new HashSet<TransferId>();

        foreach (var row in rows)
        {
            if (!lookups.ExistingRefs.Add(row.ImportRef))
            {
                skipped++;
                continue;
            }

            var currency = row.Currency ?? accountCurrency;
            var categoryId = row.CategoryId is { } id ? new CategoryId(id) : (CategoryId?)null;
            if (categoryId is { } chosen && lookups.CategoryTypes.GetValueOrDefault(chosen) != row.Type)
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

            var value = await valuations.ValueAsync(accountId, row.Amount, currency, row.Date, [], cancellationToken);
            if (!value.TryGetValue(out var valued))
            {
                return value.Error;
            }

            var created = new Transaction
            {
                AccountId = accountId,
                CategoryId = categoryId,
                Type = row.Type,
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

        return new ImportTotals(imported, skipped);
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
        IReadOnlySet<TransferId> AlreadyImported);

    private sealed record ImportTotals(int Imported, int Skipped);

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
