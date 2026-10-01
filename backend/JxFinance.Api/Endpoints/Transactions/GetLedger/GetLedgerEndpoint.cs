using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.GetLedger;

public sealed class GetLedgerEndpoint(ITransactionService transactionService)
    : Endpoint<GetLedgerRequest, PagedResponse<LedgerItemResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Transactions + "/ledger");
        Group<TransactionsGroup>();
    }

    public override async Task HandleAsync(GetLedgerRequest req, CancellationToken ct) =>
        await Send.OkAsync(await transactionService.GetLedgerPageAsync(req, ct), ct);
}
