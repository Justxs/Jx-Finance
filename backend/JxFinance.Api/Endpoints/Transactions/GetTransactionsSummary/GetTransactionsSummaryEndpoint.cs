using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.GetTransactionsSummary;

public sealed class GetTransactionsSummaryEndpoint(ITransactionService transactionService)
    : Endpoint<GetTransactionsSummaryRequest, TransactionsSummaryResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Transactions + "/summary");
        Group<TransactionsGroup>();
    }

    public override async Task HandleAsync(GetTransactionsSummaryRequest req, CancellationToken ct) =>
        await Send.OkAsync(await transactionService.GetSummaryAsync(req, ct), ct);
}
