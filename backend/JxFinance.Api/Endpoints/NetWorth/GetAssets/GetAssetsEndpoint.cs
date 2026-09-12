using FastEndpoints;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.GetAssets;

public sealed class GetAssetsEndpoint(INetWorthService netWorthService) : EndpointWithoutRequest<IReadOnlyList<AssetResponse>>
{
    public override void Configure()
    {
        Get("assets");
        Group<NetWorthGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await netWorthService.GetAssetsAsync(ct), ct);
    }
}
