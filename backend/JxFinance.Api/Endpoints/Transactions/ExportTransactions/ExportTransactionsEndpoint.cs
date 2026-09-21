using System.Globalization;
using System.Text;
using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Tags.Interfaces;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class ExportTransactionsEndpoint(
    ITransactionService transactionService,
    IAccountService accountService,
    ICategoryService categoryService) : Endpoint<GetTransactionsRequest>
{
    private const string FormulaTriggers = "=+-@\t\r";
    private const int BufferSize = 16 * 1024;

    public override void Configure()
    {
        Get("transactions/export");
        Group<TransactionsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<byte[]>(200, "text/csv"));
    }

    public override async Task HandleAsync(GetTransactionsRequest req, CancellationToken ct)
    {
        var (accountNames, categoryNames) = await LoadNamesAsync(accountService, categoryService, ct);

        HttpContext.MarkResponseStart();
        HttpContext.Response.StatusCode = StatusCodes.Status200OK;
        HttpContext.Response.ContentType = "text/csv";
        HttpContext.Response.Headers.ContentDisposition = "attachment; filename=transactions.csv";

        await using var writer = new StreamWriter(HttpContext.Response.Body, new UTF8Encoding(false), BufferSize, leaveOpen: true);
        await writer.WriteLineAsync("Date,Description,Account,Category,Tags,Type,Amount,Currency");
        await foreach (var transaction in transactionService.StreamExportAsync(req, ct))
        {
            await writer.WriteLineAsync(Row(transaction, accountNames, categoryNames));
        }

        await writer.FlushAsync(ct);
    }

    public static async Task<(Dictionary<Guid, string> AccountNames, Dictionary<Guid, string> CategoryNames)> LoadNamesAsync(
        IAccountService accountService,
        ICategoryService categoryService,
        CancellationToken ct)
    {
        var accounts = await accountService.GetAllAsync(ct);
        var categories = await categoryService.GetAllAsync(ct);
        var tags = await tagService.GetAllAsync(ct);

        return (
            accounts.ToDictionary(a => a.Id, a => a.Name),
            categories.ToDictionary(c => c.Id.Value, c => c.Name),
            tags.ToDictionary(t => t.Id.Value, t => t.Name));
    }

    private static string Row(
        TransactionResponse transaction,
        Dictionary<Guid, string> accountNames,
        Dictionary<Guid, string> categoryNames)
    {
        var category = transaction.CategoryId is { } categoryId ? categoryNames.GetValueOrDefault(categoryId) : null;
        return string.Join(
            ',',
            Escape(transaction.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)),
            Escape(Neutralize(transaction.Description ?? "")),
            Escape(Neutralize(accountNames.GetValueOrDefault(transaction.AccountId) ?? "")),
            Escape(Neutralize(category ?? "")),
            Escape(transaction.Type.ToString()),
            Escape(transaction.Amount.ToString("0.00", CultureInfo.InvariantCulture)),
            Escape(transaction.Currency.ToCode()));
    }

    private static string Neutralize(string value) =>
        value.Length > 0 && FormulaTriggers.Contains(value[0]) ? $"'{value}" : value;

    private static string Escape(string value) =>
        value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r')
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
}
