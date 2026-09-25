using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.BulkCategorizeTransactions;

public sealed class BulkCategorizeTransactionsEndpoint(ITransactionService transactionService)
    : Endpoint<BulkCategorizeTransactionsRequest, BulkCategorizeTransactionsResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Transactions + "/bulk-category");
        Group<TransactionsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(BulkCategorizeTransactionsRequest req, CancellationToken ct)
    {
        var result = await transactionService.BulkCategorizeAsync(req, ct);
        await Send.OkOrProblemAsync(result.Map(updated => new BulkCategorizeTransactionsResponse(updated)), ct);
    }
}
