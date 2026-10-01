using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.BulkMoveTransactions;

public sealed class BulkMoveTransactionsEndpoint(ITransactionService transactionService)
    : Endpoint<BulkMoveTransactionsRequest, BulkMoveTransactionsResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Transactions + "/bulk-account");
        Group<TransactionsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(BulkMoveTransactionsRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await transactionService.BulkMoveAsync(req, ct), ct);
}
