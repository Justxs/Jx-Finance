using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.BulkDeleteTransactions;

public sealed class BulkDeleteTransactionsEndpoint(ITransactionWriteService transactionService)
    : Endpoint<BulkDeleteTransactionsRequest, BulkDeleteTransactionsResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Transactions + "/bulk-delete");
        Group<TransactionsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(BulkDeleteTransactionsRequest req, CancellationToken ct)
    {
        var result = await transactionService.BulkDeleteAsync(req, ct);
        await Send.OkOrProblemAsync(result.Map(deleted => new BulkDeleteTransactionsResponse(deleted)), ct);
    }
}
