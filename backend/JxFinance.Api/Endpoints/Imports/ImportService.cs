using System.Globalization;
using CsvHelper;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Imports.Confirm;
using JxFinance.Endpoints.Imports.Preview;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Imports;

public sealed class ImportService(AppDbContext db) : IImportService
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
        catch (Exception ex) when (ex is CsvHelperException or FormatException or IndexOutOfRangeException)
        {
            return Result<ImportPreviewResponse>.Failure(
                ErrorCodes.Validation,
                "The file doesn't match the expected Swedbank CSV export shape.");
        }

        if (parsedRows.Count == 0)
        {
            return Result<ImportPreviewResponse>.Success(new ImportPreviewResponse([]));
        }

        var importRefs = parsedRows.Select(r => r.ImportRef).ToList();
        var existingRefs = await db.Transactions
            .Where(t => t.AccountId == typedAccountId && t.ImportRef != null && importRefs.Contains(t.ImportRef))
            .Select(t => t.ImportRef!)
            .ToListAsync(cancellationToken);
        var existingRefSet = existingRefs.ToHashSet();

        var rows = parsedRows
            .Select(r => new ImportPreviewRow(
                r.ImportRef,
                r.Date,
                r.Payee,
                r.Description,
                MoneyWire.ToWire(new Money(r.Amount)),
                r.Type,
                existingRefSet.Contains(r.ImportRef),
                LooksLikeTransfer(r.Payee, r.Description)))
            .ToList();

        return Result<ImportPreviewResponse>.Success(new ImportPreviewResponse(rows));
    }

    public async Task<Result<ImportConfirmResponse>> ConfirmAsync(
        ImportConfirmRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = new AccountId(request.AccountId);
        var accountExists = await db.Accounts.AnyAsync(a => a.Id == accountId, cancellationToken);
        if (!accountExists)
        {
            return Result<ImportConfirmResponse>.Failure(ErrorCodes.Validation, "Account does not exist.");
        }

        var importRefs = request.Rows.Select(r => r.ImportRef).ToList();
        var existingRefs = await db.Transactions
            .Where(t => t.AccountId == accountId && t.ImportRef != null && importRefs.Contains(t.ImportRef))
            .Select(t => t.ImportRef!)
            .ToListAsync(cancellationToken);
        var existingRefSet = existingRefs.ToHashSet();

        var imported = 0;
        var skipped = 0;

        foreach (var row in request.Rows)
        {
            if (existingRefSet.Contains(row.ImportRef))
            {
                skipped++;
                continue;
            }

            var categoryId = row.CategoryId is { } id ? new CategoryId(id) : (CategoryId?)null;
            if (categoryId is not null)
            {
                var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == categoryId, cancellationToken);
                if (category is null || category.Type != row.Type)
                {
                    categoryId = null;
                }
            }

            db.Transactions.Add(new Transaction
            {
                AccountId = accountId,
                CategoryId = categoryId,
                Type = row.Type,
                Amount = MoneyWire.Parse(row.Amount),
                Date = row.Date,
                Description = string.IsNullOrWhiteSpace(row.Description) ? null : row.Description.Trim(),
                Source = TransactionSource.Imported,
                ImportRef = row.ImportRef,
            });
            imported++;
        }

        await db.SaveChangesAsync(cancellationToken);

        return Result<ImportConfirmResponse>.Success(new ImportConfirmResponse(imported, skipped));
    }

    private static List<ParsedRow> ParseCsv(Stream fileStream)
    {
        using var reader = new StreamReader(fileStream);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        csv.Read();
        csv.ReadHeader();

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

            rows.Add(new ParsedRow(
                importRef,
                date,
                payee,
                description,
                amount,
                direction == "K" ? FlowType.Income : FlowType.Expense));
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
        FlowType Type);
}
