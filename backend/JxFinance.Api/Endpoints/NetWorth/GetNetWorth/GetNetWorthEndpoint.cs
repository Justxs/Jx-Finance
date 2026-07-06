using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.GetNetWorth;

public sealed class GetNetWorthEndpoint(INetWorthService netWorthService) : EndpointWithoutRequest<NetWorthResponse>
{
    public override void Configure()
    {
        Get("/api/networth");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await netWorthService.GetCurrentAsync(ct), ct);
    }
}
