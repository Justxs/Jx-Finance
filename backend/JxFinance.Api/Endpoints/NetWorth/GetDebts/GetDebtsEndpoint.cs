using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.GetDebts;

public sealed class GetDebtsEndpoint(INetWorthService netWorthService) : EndpointWithoutRequest<IReadOnlyList<DebtResponse>>
{
    public override void Configure()
    {
        Get("/api/debts");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await netWorthService.GetDebtsAsync(ct), ct);
    }
}
