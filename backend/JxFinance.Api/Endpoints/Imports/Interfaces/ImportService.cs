using System.Globalization;
using CsvHelper;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.Imports.Confirm;
using JxFinance.Endpoints.Imports.Preview;
using JxFinance.Endpoints.Imports.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Imports.Interfaces;

[RegisterService<IImportService>(LifeTime.Scoped)]
public sealed class ImportService(AppDbContext db, IExchangeRateService rates) : IImportService
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
        var accountExists = await db.Accounts.AnyAsync(a => a.Id == typedAccountId, cancellationToken);
        if (!accountExists)
        {
            return Result<ImportPreviewResponse>.Failure(ErrorCodes.Validation, "Account does not exist.");
        }

        List<ParsedRow> parsedRows;
        try
        {
            parsedRows = ParseCsv(fileStream);
        }
        catch (Exception ex) when (ex is CsvHelperException or FormatException or IndexOutOfRangeException or OverflowException)
        {
            return Result<ImportPreviewResponse>.Failure(
                ErrorCodes.Validation,
                "The file doesn't match the expected Swedbank CSV export shape.");
        }

        if (parsedRows.Count == 0)
        {
            return Result<ImportPreviewResponse>.Success(new ImportPreviewResponse([]));
        }

        var existingRefSet = await ExistingRefsAsync(typedAccountId, parsedRows.Select(r => r.ImportRef), cancellationToken);

        var rows = parsedRows
            .Select(r => new ImportPreviewRow(
                r.ImportRef,
                r.Date,
                r.Payee,
                r.Description,
                MoneyWire.ToWire(new Money(r.Amount)),
                r.Type,
                !existingRefSet.Add(r.ImportRef),
                LooksLikeTransfer(r.Payee, r.Description),
                r.Currency))
            .ToList();

        return Result<ImportPreviewResponse>.Success(new ImportPreviewResponse(rows));
    }

    public async Task<Result<ImportConfirmResponse>> ConfirmAsync(
        ImportConfirmRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        // Serialize imports per account across processes, including concurrent requests.
        var lockId = BitConverter.ToInt64(request.AccountId.ToByteArray(), 0);
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({lockId})", cancellationToken);
        var accountId = new AccountId(request.AccountId);
        var accountCurrency = await db.Accounts
            .Where(a => a.Id == accountId)
            .Select(a => (Currency?)a.StartingBalance.Currency)
            .FirstOrDefaultAsync(cancellationToken);
        if (accountCurrency is null)
        {
            return Result<ImportConfirmResponse>.Failure(ErrorCodes.Validation, "Account does not exist.");
        }

        var existingRefSet = await ExistingRefsAsync(accountId, request.Rows.Select(r => r.ImportRef), cancellationToken);

        var categoryIds = request.Rows.Where(r => r.CategoryId is not null).Select(r => new CategoryId(r.CategoryId!.Value)).Distinct().ToList();
        var categoryTypes = await db.Categories
            .Where(c => categoryIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => (FlowType?)c.Type, cancellationToken);

        var imported = 0;
        var skipped = 0;

        foreach (var row in request.Rows)
        {
            if (!existingRefSet.Add(row.ImportRef))
            {
                skipped++;
                continue;
            }

            var amount = MoneyWire.Parse(row.Amount, row.Currency ?? accountCurrency.Value);
            var categoryId = row.CategoryId is { } id ? new CategoryId(id) : (CategoryId?)null;
            if (categoryId is { } chosen && categoryTypes.GetValueOrDefault(chosen) != row.Type)
            {
                return Result<ImportConfirmResponse>.Failure(ErrorCodes.Validation, "Category does not exist or has the wrong type.");
            }

            if (row.TransferAccountId is { } otherId)
            {
                var otherAccountId = new AccountId(otherId);
                if (otherAccountId == accountId || !await db.Accounts.AnyAsync(a => a.Id == otherAccountId, cancellationToken))
                    return Result<ImportConfirmResponse>.Failure(ErrorCodes.Validation, "Choose another accessible account for the transfer.");
                var fromId = row.Type == FlowType.Expense ? accountId : otherAccountId;
                var toId = row.Type == FlowType.Expense ? otherAccountId : accountId;
                Transfer transfer;
                if (row.ExistingTransferId is { } existingId)
                {
                    var match = await db.Transfers.FirstOrDefaultAsync(t => t.Id == new TransferId(existingId), cancellationToken);
                    if (match is null || match.FromAccountId != fromId || match.ToAccountId != toId
                        || (row.Type == FlowType.Expense ? match.Amount : match.ReceivedAmount) != amount || match.Date != row.Date)
                        return Result<ImportConfirmResponse>.Failure(ErrorCodes.Validation, "The selected transfer does not match this bank entry.");
                    transfer = match;
                }
                else
                {
                    transfer = new Transfer { FromAccountId = fromId, ToAccountId = toId,
                        Amount = amount, ReceivedAmount = amount, Date = row.Date, Description = row.Description };
                    db.Transfers.Add(transfer);
                }
                db.TransferImports.Add(new TransferImport { AccountId = accountId, ImportRef = row.ImportRef, TransferId = transfer.Id });
                imported++;
                continue;
            }
            if (row.ExistingTransferId is not null)
                return Result<ImportConfirmResponse>.Failure(ErrorCodes.Validation, "Choose the other account before matching a transfer.");

            var reporting = await rates.ToReportingAsync(amount, row.Date, cancellationToken);
            if (reporting.IsFailure)
            {
                return Result<ImportConfirmResponse>.FailureFrom(reporting);
            }

            db.Transactions.Add(new Transaction
            {
                AccountId = accountId,
                CategoryId = categoryId,
                Type = row.Type,
                Amount = amount,
                ReportingAmount = reporting.Value,
                Date = row.Date,
                Description = string.IsNullOrWhiteSpace(row.Description) ? null : row.Description.Trim(),
                Source = TransactionSource.Imported,
                ImportRef = row.ImportRef,
            });
            imported++;
        }

        await db.SaveChangesAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return Result<ImportConfirmResponse>.Success(new ImportConfirmResponse(imported, skipped));
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
            var amount = decimal.Parse(csv.GetField(5)!.Trim(), CultureInfo.InvariantCulture);
            var direction = csv.GetField(7)?.Trim();
            var importRef = csv.GetField(8)!.Trim();

            if (direction is not ("D" or "K") || !CurrencyCode.TryParse(csv.GetField(6), out var currency)
                || string.IsNullOrWhiteSpace(importRef) || importRef.Length > 64
                || amount <= 0 || !MoneyWire.IsValid(csv.GetField(5)?.Trim()) || description?.Length > 500)
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
