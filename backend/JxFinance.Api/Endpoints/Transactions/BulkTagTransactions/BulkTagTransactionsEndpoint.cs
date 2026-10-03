using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.BulkTagTransactions;

public sealed class BulkTagTransactionsEndpoint(ITransactionWriteService transactionService)
    : Endpoint<BulkTagTransactionsRequest, BulkTagTransactionsResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Transactions + "/bulk-tags");
        Group<TransactionsGroup>();
        Metadata(TokenWritable.Yes);
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(BulkTagTransactionsRequest req, CancellationToken ct)
    {
        var result = await transactionService.BulkTagAsync(req, ct);
        await Send.OkOrProblemAsync(result.Map(updated => new BulkTagTransactionsResponse(updated)), ct);
    }
}
