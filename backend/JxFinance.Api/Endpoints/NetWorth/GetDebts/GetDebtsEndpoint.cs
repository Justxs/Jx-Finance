using FastEndpoints;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.GetDebts;

public sealed class GetDebtsEndpoint(INetWorthService netWorthService) : EndpointWithoutRequest<IReadOnlyList<DebtResponse>>
{
    public override void Configure()
    {
        Get("debts");
        Group<NetWorthGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await netWorthService.GetDebtsAsync(ct), ct);
    }
}
