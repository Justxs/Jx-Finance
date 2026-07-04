using FastEndpoints;
using JxFinance.Common;

namespace JxFinance.Endpoints.Transactions.GetTransactions;

public sealed class GetTransactionsEndpoint(ITransactionService transactionService)
    : Endpoint<GetTransactionsRequest, PagedResponse<TransactionResponse>>
{
    public override void Configure()
    {
        Get("/api/transactions");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetTransactionsRequest req, CancellationToken ct)
    {
        var pageResult = await transactionService.GetPageAsync(req, ct);
        await Send.OkAsync(pageResult, ct);
    }
}
