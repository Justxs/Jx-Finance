using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.GetDebtBalances;

public sealed class GetDebtBalancesEndpoint(INetWorthService netWorthService)
    : Endpoint<GetDebtBalancesRequest, IReadOnlyList<DebtBalanceEntryResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Debts + "/{id}/balances");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetDebtBalancesRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await netWorthService.GetDebtBalancesAsync(req.Id, ct), ct);
}
