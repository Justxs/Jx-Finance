using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.GetTransactions;

public sealed class GetTransactionsEndpoint(ITransactionService transactionService)
    : Endpoint<GetTransactionsRequest, PagedResponse<TransactionResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Transactions);
        Group<TransactionsGroup>();
    }

    public override async Task HandleAsync(GetTransactionsRequest req, CancellationToken ct)
    {
        var pageResult = await transactionService.GetPageAsync(req, ct);
        await Send.OkAsync(pageResult, ct);
    }
}
