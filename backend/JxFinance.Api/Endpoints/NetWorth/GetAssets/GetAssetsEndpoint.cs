using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.GetAssets;

public sealed class GetAssetsEndpoint(INetWorthService netWorthService) : EndpointWithoutRequest<IReadOnlyList<AssetResponse>>
{
    public override void Configure()
    {
        Get("/api/assets");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await netWorthService.GetAssetsAsync(ct), ct);
    }
}
