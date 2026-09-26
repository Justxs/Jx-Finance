using System.Globalization;
using CsvHelper;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Formats;
using JxFinance.Common.References;
using JxFinance.Common.Settings;
using JxFinance.Common.Transfers;
using JxFinance.Common.Trash;
using JxFinance.Common.Validation;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Endpoints.Imports.Confirm;
using JxFinance.Endpoints.Imports.Interfaces;
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
    IInstanceSettingsStore settings) : IImportService
{
    private const string TransactionRowType = "20";

    private static readonly string[] TransferKeywords =
    [
        "transfer", "pervedimas", "grynieji", "cash", "withdrawal", "easy saver", "atsiskaitom", "tarp saskaitu",
    ];

    public async Task<Result<ImportPreviewResponse>> PreviewSwedbankCsvAsync(
        Guid accountId,
        Stream fileStream,
        CancellationToken cancellationToken)
    {
        var typedAccountId = new AccountId(accountId);
        if (await references.AccountExistsAsync(typedAccountId, cancellationToken) is { } accountError)
        {
            return accountError;
        }

        List<ParsedRow> parsedRows;
        try
        {
            parsedRows = ParseCsv(fileStream);
        }
        catch (Exception ex) when (ex is CsvHelperException or FormatException or IndexOutOfRangeException or OverflowException)
        {
            return new DomainError(
                ErrorCodes.ImportInvalidFile,
                "The file doesn't match the expected Swedbank CSV export shape.");
        }

        if (parsedRows.Count == 0)
        {
            return new ImportPreviewResponse([]);
        }

        var existingRefSet = await ExistingRefsAsync(typedAccountId, parsedRows.Select(r => r.ImportRef), cancellationToken);
        var suggestions = await SuggestionsAsync(typedAccountId, parsedRows, cancellationToken);

        var rows = parsedRows
            .Select((r, index) => new ImportPreviewRow(
                r.ImportRef,
                r.Date,
                r.Payee,
                r.Description,
                r.Amount,
                r.Type,
                !existingRefSet.Add(r.ImportRef),
                LooksLikeTransfer(r.Payee, r.Description),
                r.Currency,
                suggestions[index]?.CategoryId,
                suggestions[index]?.TagIds ?? [],
                suggestions[index]?.RuleName))
            .ToList();

        return new ImportPreviewResponse(rows);
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
                    $"Swedbank CSV into {target.Name}",
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

    private static List<ParsedRow> ParseCsv(Stream fileStream)
    {
        using var reader = new StreamReader(fileStream);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        csv.Read();
        csv.ReadHeader();
        string[] expected = ["Sąskaitos Nr.", "", "Data", "Gavėjas", "Paaiškinimai", "Suma", "Valiuta", "D/K", "Įrašo Nr."];
        if (csv.HeaderRecord is not { Length: >= 9 } headers ||
            !expected.Select((name, index) => headers[index].Trim() == name).All(matches => matches))
            throw new FormatException("Unexpected CSV columns.");

        var rows = new List<ParsedRow>();
        while (csv.Read())
        {
            var rowType = csv.GetField(1);
            if (rowType != TransactionRowType)
            {
                continue;
            }

            var date = DateOnly.ParseExact(csv.GetField(2)!.Trim(), DateFormats.IsoDate, CultureInfo.InvariantCulture);
            var payee = csv.GetField(3)?.Trim();
            var description = csv.GetField(4)?.Trim();
            var amount = decimal.Parse(csv.GetField(5)!.Trim(), NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture);
            var direction = csv.GetField(7)?.Trim();
            var importRef = csv.GetField(8)!.Trim();

            if (direction is not ("D" or "K") || !CurrencyCode.TryParse(csv.GetField(6), out var currency)
                || string.IsNullOrWhiteSpace(importRef) || importRef.Length > 64
                || amount <= 0 || !DecimalRules.FitsMoney(amount) || description?.Length > 500)
                throw new FormatException("Invalid bank entry.");
            if (rows.Count >= 10000) throw new FormatException("At most 10000 entries can be imported at once.");

            rows.Add(new ParsedRow(
                importRef,
                date,
                payee,
                description,
                amount,
                direction == "K" ? FlowType.Income : FlowType.Expense,
                currency));
        }

        return rows;
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

    private static bool LooksLikeTransfer(string? payee, string? description)
    {
        var text = $"{payee} {description}".ToLowerInvariant();
        return TransferKeywords.Any(text.Contains);
    }

    private sealed record ParsedRow(
        string ImportRef,
        DateOnly Date,
        string? Payee,
        string? Description,
        decimal Amount,
        FlowType Type,
        Currency Currency);

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
