using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;

namespace JxFinance.Endpoints.NetWorth.DeleteDebtBalance;

public sealed class DeleteDebtBalanceEndpoint(INetWorthService netWorthService) : Endpoint<DeleteDebtBalanceRequest>
{
    public override void Configure()
    {
        Delete(ApiRoutes.Debts + "/{id}/balances/{date}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(400).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(DeleteDebtBalanceRequest req, CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await netWorthService.DeleteDebtBalanceAsync(req, ct), ct);
}
