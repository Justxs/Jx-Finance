using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.BulkTagTransactions;

public sealed class BulkTagTransactionsEndpoint(ITransactionService transactionService)
    : Endpoint<BulkTagTransactionsRequest, BulkTagTransactionsResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Transactions + "/bulk-tags");
        Group<TransactionsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(BulkTagTransactionsRequest req, CancellationToken ct)
    {
        var result = await transactionService.BulkTagAsync(req, ct);
        if (!result.TryGetValue(out var updated))
        {
            await Send.ProblemAsync(result.Error, ct);
            return;
        }

        await Send.OkAsync(new BulkTagTransactionsResponse(updated), ct);
    }
}
