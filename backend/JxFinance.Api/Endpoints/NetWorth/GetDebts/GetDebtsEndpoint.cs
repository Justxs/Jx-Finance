using FastEndpoints;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Mappers;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.GetDebts;

public sealed class GetDebtsEndpoint(INetWorthService netWorthService) : EndpointWithoutRequest<IReadOnlyList<DebtResponse>, DebtMapper>
{
    public override void Configure()
    {
        Get("debts");
        Group<NetWorthGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var debts = await netWorthService.GetDebtsAsync(ct);
        await Send.OkAsync(debts.Select(Map.FromEntity).ToList(), ct);
    }
}
