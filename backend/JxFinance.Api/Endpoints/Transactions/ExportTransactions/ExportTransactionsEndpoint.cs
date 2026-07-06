using System.Globalization;
using System.Text;
using FastEndpoints;
using JxFinance.Endpoints.Accounts;
using JxFinance.Endpoints.Categories;
using JxFinance.Endpoints.Transactions.GetTransactions;
using QuestPDF.Fluent;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class ExportTransactionsEndpoint(
    ITransactionService transactionService,
    IAccountService accountService,
    ICategoryService categoryService) : Endpoint<GetTransactionsRequest>
{
    public override void Configure()
    {
        Get("/api/transactions/export");
    }

    public override async Task HandleAsync(GetTransactionsRequest req, CancellationToken ct)
    {
        var transactions = await transactionService.ExportAsync(req, ct);
        var accounts = await accountService.GetAllAsync(ct);
        var categories = await categoryService.GetAllAsync(ct);

        var accountNames = accounts.ToDictionary(a => a.Id, a => a.Name);
        var categoryNames = categories.ToDictionary(c => c.Id, c => c.Name);

        var csv = BuildCsv(transactions, accountNames, categoryNames);
        await Send.BytesAsync(Encoding.UTF8.GetBytes(csv), "transactions.csv", "text/csv", cancellation: ct);
    }

    public static async Task<byte[]> BuildPdfAsync(
        ITransactionService transactionService,
        IAccountService accountService,
        ICategoryService categoryService,
        GetTransactionsRequest req,
        CancellationToken ct)
    {
        var transactions = await transactionService.ExportAsync(req, ct);
        var accounts = await accountService.GetAllAsync(ct);
        var categories = await categoryService.GetAllAsync(ct);

        var accountNames = accounts.ToDictionary(a => a.Id, a => a.Name);
        var categoryNames = categories.ToDictionary(c => c.Id, c => c.Name);

        var document = new TransactionsPdfDocument(transactions, accountNames, categoryNames, req.DateFrom, req.DateTo);
        return document.GeneratePdf();
    }

    private static string BuildCsv(
        IReadOnlyList<TransactionResponse> transactions,
        Dictionary<Guid, string> accountNames,
        Dictionary<Guid, string> categoryNames)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Date,Description,Account,Category,Type,Amount");

        foreach (var transaction in transactions)
        {
            var category = transaction.CategoryId is { } categoryId ? categoryNames.GetValueOrDefault(categoryId) : null;
            builder.AppendLine(string.Join(
                ',',
                Escape(transaction.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)),
                Escape(transaction.Description ?? ""),
                Escape(accountNames.GetValueOrDefault(transaction.AccountId) ?? ""),
                Escape(category ?? ""),
                Escape(transaction.Type.ToString()),
                Escape(transaction.Amount)));
        }

        return builder.ToString();
    }

    private static string Escape(string value) =>
        value.Contains(',') || value.Contains('"') || value.Contains('\n')
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
}
