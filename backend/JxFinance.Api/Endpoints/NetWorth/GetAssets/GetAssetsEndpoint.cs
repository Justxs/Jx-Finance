using FastEndpoints;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Mappers;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.GetAssets;

public sealed class GetAssetsEndpoint(INetWorthService netWorthService) : EndpointWithoutRequest<IReadOnlyList<AssetResponse>, AssetMapper>
{
    public override void Configure()
    {
        Get("assets");
        Group<NetWorthGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var assets = await netWorthService.GetAssetsAsync(ct);
        await Send.OkAsync(assets.Select(Map.FromEntity).ToList(), ct);
    }
}
