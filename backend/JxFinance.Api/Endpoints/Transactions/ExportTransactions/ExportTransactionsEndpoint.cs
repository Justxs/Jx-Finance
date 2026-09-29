using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
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
        Options(b => b.WithMetadata(QueryHouseholdScope.Instance));
        Description(d => d.ProducesFile(MediaTypeNames.Text.Csv));
    }

    public override async Task HandleAsync(GetTransactionsRequest req, CancellationToken ct)
    {
        var names = await ExportNames.LoadAsync(accountService, categoryService, tagService, ct);

        await using var writer = HttpContext.StartCsv("transactions.csv");
        await writer.WriteLineAsync(TransactionCsvWriter.Header);
        await foreach (var transaction in transactionService.StreamExportAsync(req, ct))
        {
            await writer.WriteLineAsync(TransactionCsvWriter.Row(transaction, names));
        }

        await writer.FlushAsync(ct);
    }
}
