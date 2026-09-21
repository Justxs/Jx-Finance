using System.Globalization;
using CsvHelper;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.References;
using JxFinance.Common.Settings;
using JxFinance.Common.Validation;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Endpoints.Imports.Confirm;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Endpoints.Imports.Preview;
using JxFinance.Endpoints.Imports.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Imports.Services;

[RegisterService<IImportService>(LifeTime.Scoped)]
public sealed class ImportService(
    AppDbContext db,
    IExchangeRateService rates,
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
        var accountCurrency = await db.Accounts
            .Where(a => a.Id == accountId)
            .Select(a => (Currency?)a.StartingBalance.Currency)
            .FirstOrDefaultAsync(cancellationToken);
        if (accountCurrency is null)
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Account does not exist.");
        }

        var existingRefSet = await ExistingRefsAsync(accountId, request.Rows.Select(r => r.ImportRef), cancellationToken);

        var wantedTagIds = request.Rows
            .SelectMany(r => r.TagIds ?? [])
            .Distinct()
            .Select(id => new TagId(id))
            .ToList();
        if (wantedTagIds.Count > 0
            && await db.Tags.CountAsync(t => wantedTagIds.Contains(t.Id), cancellationToken) != wantedTagIds.Count)
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Tag does not exist.");
        }

        var categoryIds = request.Rows.Where(r => r.CategoryId is not null).Select(r => new CategoryId(r.CategoryId!.Value)).Distinct().ToList();
        var categoryTypes = await db.Categories
            .Where(c => categoryIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => (FlowType?)c.Type, cancellationToken);

        var imported = 0;
        var skipped = 0;
        var matchedTransfers = new HashSet<TransferId>();

        foreach (var row in request.Rows)
        {
            if (!existingRefSet.Add(row.ImportRef))
            {
                skipped++;
                continue;
            }

            var amount = new Money(row.Amount, row.Currency ?? accountCurrency.Value);
            var categoryId = row.CategoryId is { } id ? new CategoryId(id) : (CategoryId?)null;
            if (categoryId is { } chosen && categoryTypes.GetValueOrDefault(chosen) != row.Type)
            {
                return new DomainError(ErrorCodes.CategoryWrongType, "Category does not exist or has the wrong type.");
            }

            if (row.TransferAccountId is { } otherId)
            {
                var otherAccountId = new AccountId(otherId);
                if (otherAccountId == accountId || await references.AccountExistsAsync(otherAccountId, cancellationToken) is not null)
                    return new DomainError(ErrorCodes.ReferenceNotFound, "Choose another accessible account for the transfer.");
                var fromId = row.Type == FlowType.Expense ? accountId : otherAccountId;
                var toId = row.Type == FlowType.Expense ? otherAccountId : accountId;
                Transfer transfer;
                if (row.ExistingTransferId is { } existingId)
                {
                    var match = await db.Transfers.FirstOrDefaultAsync(t => t.Id == new TransferId(existingId), cancellationToken);
                    if (match is null || match.FromAccountId != fromId || match.ToAccountId != toId
                        || (row.Type == FlowType.Expense ? match.Amount : match.ReceivedAmount) != amount || match.Date != row.Date)
                        return new DomainError(ErrorCodes.ImportTransferMismatch, "The selected transfer does not match this bank entry.");
                    if (!matchedTransfers.Add(match.Id)
                        || await db.TransferImports.AnyAsync(r => r.AccountId == accountId && r.TransferId == match.Id, cancellationToken))
                        return new DomainError(
                            ErrorCodes.ImportTransferAlreadyMatched,
                            "The selected transfer is already matched to another bank entry of this account.");
                    transfer = match;
                }
                else
                {
                    transfer = new Transfer
                    {
                        FromAccountId = fromId,
                        ToAccountId = toId,
                        Amount = amount,
                        ReceivedAmount = amount,
                        Date = row.Date,
                        Description = row.Description
                    };
                    db.Transfers.Add(transfer);
                }
                db.TransferImports.Add(new TransferImport { AccountId = accountId, ImportRef = row.ImportRef, TransferId = transfer.Id });
                imported++;
                continue;
            }
            if (row.ExistingTransferId is not null)
                return new DomainError(ErrorCodes.Required, "Choose the other account before matching a transfer.");

            var reporting = await rates.ToReportingAsync(amount, row.Date, cancellationToken);
            if (reporting.IsFailure)
            {
                return reporting.Error;
            }

            var created = new Transaction
            {
                AccountId = accountId,
                CategoryId = categoryId,
                Type = row.Type,
                Amount = amount,
                ReportingAmount = reporting.Value,
                Date = row.Date,
                Description = OptionalText.Normalize(row.Description),
                Source = TransactionSource.Imported,
                ImportRef = row.ImportRef,
            };
            db.Transactions.Add(created);
            db.TransactionTags.AddRange((row.TagIds ?? [])
                .Distinct()
                .Select(tagId => new TransactionTag { TransactionId = created.Id, TagId = new TagId(tagId) }));
            imported++;
        }

        await db.SaveChangesAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return new ImportConfirmResponse(imported, skipped);
    }

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

            var date = DateOnly.ParseExact(csv.GetField(2)!.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture);
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
