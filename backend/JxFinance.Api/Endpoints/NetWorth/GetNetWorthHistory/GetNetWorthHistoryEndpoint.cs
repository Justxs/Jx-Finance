using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.GetNetWorthHistory;

public sealed class GetNetWorthHistoryEndpoint(INetWorthService netWorthService)
    : EndpointWithoutRequest<NetWorthHistoryResponse>
{
    public override void Configure()
    {
        Get("/api/networth/history");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await netWorthService.GetHistoryAsync(ct), ct);
    }
}
