using System.Globalization;
using System.Text;
using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class ExportTransactionsEndpoint(
    ITransactionService transactionService,
    IAccountService accountService,
    ICategoryService categoryService) : Endpoint<GetTransactionsRequest>
{
    public override void Configure()
    {
        Get("transactions/export");
        Group<TransactionsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<byte[]>(200, "text/csv"));
    }

    public override async Task HandleAsync(GetTransactionsRequest req, CancellationToken ct)
    {
        var (transactions, accountNames, categoryNames) =
            await LoadAsync(transactionService, accountService, categoryService, req, ct);

        var csv = BuildCsv(transactions, accountNames, categoryNames);
        await Send.BytesAsync(Encoding.UTF8.GetBytes(csv), "transactions.csv", "text/csv", cancellation: ct);
    }

    public static async Task<(IReadOnlyList<TransactionResponse>, Dictionary<Guid, string>, Dictionary<Guid, string>)> LoadAsync(
        ITransactionService transactionService,
        IAccountService accountService,
        ICategoryService categoryService,
        GetTransactionsRequest req,
        CancellationToken ct)
    {
        var transactions = await transactionService.ExportAsync(req, ct);
        var accounts = await accountService.GetAllAsync(ct);
        var categories = await categoryService.GetAllAsync(ct);

        return (
            transactions,
            accounts.ToDictionary(a => a.Id, a => a.Name),
            categories.ToDictionary(c => c.Id.Value, c => c.Name));
    }

    private static string BuildCsv(
        IReadOnlyList<TransactionResponse> transactions,
        Dictionary<Guid, string> accountNames,
        Dictionary<Guid, string> categoryNames)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Date,Description,Account,Category,Type,Amount,Currency");

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
                Escape(transaction.Amount.ToString("0.00", CultureInfo.InvariantCulture)),
                Escape(transaction.Currency.ToCode())));
        }

        return builder.ToString();
    }

    private static string Escape(string value) =>
        value.Contains(',') || value.Contains('"') || value.Contains('\n')
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
}
