using System.Globalization;
using System.Net.Mime;
using System.Text;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Formats;
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
    ICategoryService categoryService,
    ITagService tagService) : Endpoint<GetTransactionsRequest>
{
    private const int BufferSize = 16 * 1024;

    public override void Configure()
    {
        Get(ApiRoutes.Transactions + "/export");
        Group<TransactionsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<byte[]>(200, MediaTypeNames.Text.Csv));
    }

    public override async Task HandleAsync(GetTransactionsRequest req, CancellationToken ct)
    {
        var names = await LoadNamesAsync(accountService, categoryService, tagService, ct);

        HttpContext.MarkResponseStart();
        HttpContext.Response.StatusCode = StatusCodes.Status200OK;
        HttpContext.Response.ContentType = MediaTypeNames.Text.Csv;
        HttpContext.Response.Headers.ContentDisposition = "attachment; filename=transactions.csv";

        await using var writer = new StreamWriter(HttpContext.Response.Body, new UTF8Encoding(false), BufferSize, leaveOpen: true);
        await writer.WriteLineAsync("Date,Description,Account,Category,Tags,Type,Amount,Currency");
        await foreach (var transaction in transactionService.StreamExportAsync(req, ct))
        {
            await writer.WriteLineAsync(Row(transaction, names));
        }

        await writer.FlushAsync(ct);
    }

    public static async Task<ExportNames> LoadNamesAsync(
        IAccountService accountService,
        ICategoryService categoryService,
        ITagService tagService,
        CancellationToken ct)
    {
        var accounts = await accountService.GetAllAsync(ct);
        var categories = await categoryService.GetAllAsync(ct);
        var tags = await tagService.GetAllAsync(ct);

        return new ExportNames(
            accounts.ToDictionary(a => a.Id, a => a.Name),
            categories.ToDictionary(c => c.Id, c => c.Name),
            tags.ToDictionary(t => t.Id, t => t.Name));
    }

    private static string Row(TransactionResponse transaction, ExportNames names)
    {
        var category = transaction.CategoryId is { } categoryId ? names.Categories.GetValueOrDefault(categoryId) : null;
        return CsvCell.Row(
            CsvCell.Value(transaction.Date.ToString(DateFormats.IsoDate, CultureInfo.InvariantCulture)),
            CsvCell.Text(transaction.Description),
            CsvCell.Text(names.Accounts.GetValueOrDefault(transaction.AccountId)),
            CsvCell.Text(category),
            CsvCell.Text(names.TagLabel(transaction.TagIds)),
            CsvCell.Value(transaction.Type.ToString()),
            CsvCell.Value(transaction.Amount.ToString("0.00", CultureInfo.InvariantCulture)),
            CsvCell.Value(transaction.Currency.ToCode()));
    }
}
