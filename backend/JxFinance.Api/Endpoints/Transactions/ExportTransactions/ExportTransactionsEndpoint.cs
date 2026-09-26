using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
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
    public override void Configure()
    {
        Get(ApiRoutes.Transactions + "/export");
        Group<TransactionsGroup>();
        Description(d => d.ProducesFile(MediaTypeNames.Text.Csv));
    }

    public override async Task HandleAsync(GetTransactionsRequest req, CancellationToken ct)
    {
        var names = await ExportNames.LoadAsync(accountService, categoryService, tagService, ct);

        await using var writer = HttpContext.StartCsv("transactions.csv");
        await writer.WriteLineAsync("Date,Description,Account,Category,Tags,Type,Amount,Currency");
        await foreach (var transaction in transactionService.StreamExportAsync(req, ct))
        {
            await writer.WriteLineAsync(Row(transaction, names));
        }

        await writer.FlushAsync(ct);
    }

    private static string Row(TransactionResponse transaction, ExportNames names)
    {
        var category = transaction.CategoryId is { } categoryId ? names.Categories.GetValueOrDefault(categoryId) : null;
        return CsvCell.Row(
            CsvCell.Date(transaction.Date),
            CsvCell.Text(transaction.Description),
            CsvCell.Text(names.Accounts.GetValueOrDefault(transaction.AccountId)),
            CsvCell.Text(category),
            CsvCell.Text(names.TagLabel(transaction.TagIds)),
            CsvCell.Value(transaction.Type.ToString()),
            CsvCell.Money(transaction.Amount),
            CsvCell.Value(transaction.Currency.ToCode()));
    }
}
