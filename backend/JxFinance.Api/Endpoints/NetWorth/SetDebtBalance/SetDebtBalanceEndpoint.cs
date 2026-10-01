using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.SetDebtBalance;

public sealed class SetDebtBalanceEndpoint(INetWorthService netWorthService)
    : Endpoint<SetDebtBalanceRequest, DebtResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Debts + "/{id}/balances/{date}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(SetDebtBalanceRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await netWorthService.SetDebtBalanceAsync(req, ct), ct);
}
