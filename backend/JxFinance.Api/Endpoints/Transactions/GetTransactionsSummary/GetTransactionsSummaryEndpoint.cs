using FastEndpoints;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.GetTransactionsSummary;

public sealed class GetTransactionsSummaryEndpoint(ITransactionService transactionService)
    : Endpoint<GetTransactionsSummaryRequest, TransactionsSummaryResponse>
{
    public override void Configure()
    {
        Get("transactions/summary");
        Group<TransactionsGroup>();
    }

    public override async Task HandleAsync(GetTransactionsSummaryRequest req, CancellationToken ct)
    {
        var summary = await transactionService.GetSummaryAsync(req, ct);
        await Send.OkAsync(summary, ct);
    }
}
