using System.Buffers;
using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Refunds;
using JxFinance.Common.Settings;
using JxFinance.Common.Subscriptions;
using JxFinance.Common.Unusual;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Accounts.Shared;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Endpoints.Imports.InspectCsv;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Endpoints.Imports.Matching;
using JxFinance.Endpoints.Imports.Parsing;
using JxFinance.Endpoints.Imports.Preview;
using JxFinance.Endpoints.Imports.Shared;
using JxFinance.Endpoints.Transactions.Mappers;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Imports.Services;

[RegisterService<IImportPreviewService>(LifeTime.Scoped)]
public sealed class ImportPreviewService(
    AppDbContext db,
    IExchangeRateService rates,
    ITransactionValuation valuations,
    ICategorizationRuleService rules,
    IUnusualAmountService unusualAmounts,
    IInstanceSettingsStore settings) : IImportPreviewService
{
    private static readonly SearchValues<string> TransferKeywords = SearchValues.Create(
        ["transfer", "pervedimas", "grynieji", "cash", "withdrawal", "easy saver", "atsiskaitom", "tarp saskaitu"],
        StringComparison.OrdinalIgnoreCase);

    private static readonly DomainError MappingNotFound = new(ErrorCodes.ReferenceNotFound, "CSV mapping does not exist.");

    public async Task<Result<InspectCsvResponse>> InspectCsvAsync(
        Stream fileStream,
        CsvEncoding? encoding,
        string? delimiter,
        int? skipLines,
        CancellationToken cancellationToken)
    {
        var inspected = await CsvInspector.InspectAsync(fileStream, encoding, delimiter, skipLines, cancellationToken);
        if (!inspected.TryGetValue(out var inspection))
        {
            return inspected.Error;
        }

        var headers = inspection.Columns.Select(c => c.Name).ToHashSet(StringComparer.Ordinal);
        var mappings = await db.CsvImportMappings
            .AsNoTracking()
            .OrderBy(m => m.Name)
            .ThenBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);
        return inspection with
        {
            MatchingMappingIds = mappings.Where(m => m.Columns.Named().All(headers.Contains)).Select(m => m.Id.Value).ToList(),
        };
    }

    public async Task<Result<ImportPreviewResponse>> PreviewAsync(
        StatementFormat format,
        Guid accountId,
        Guid? mappingId,
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

        var parsed = format switch
        {
            StatementFormat.Camt053 => await Camt053Parser.ParseAsync(fileStream, account.Iban, settings.Current.TimeZone, cancellationToken),
            StatementFormat.GenericCsv => await ImportQueries.FindMappingAsync(db, mappingId, cancellationToken) is { } mapping
                ? GenericCsvParser.Parse(fileStream, mapping, account.Currency)
                : MappingNotFound,
            _ => SwedbankCsvParser.Parse(fileStream),
        };
        if (!parsed.TryGetValue(out var statement))
        {
            return parsed.Error;
        }

        Guid? OtherAccount(string? iban) =>
            accounts.Find(a => iban is not null && a.Iban == iban && a.Id != typedAccountId)?.Id.Value;

        var parsedRows = statement.Rows;
        var existingRefSet = await ImportQueries.ExistingRefsAsync(db, typedAccountId, parsedRows.Select(r => r.ImportRef), cancellationToken);
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

    private static bool LooksLikeTransfer(string? payee, string? description) =>
        $"{payee} {description}".AsSpan().ContainsAny(TransferKeywords);
}
