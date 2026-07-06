using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.CreateAsset;

public sealed class CreateAssetEndpoint(INetWorthService netWorthService) : Endpoint<CreateAssetRequest, AssetResponse>
{
    public override void Configure()
    {
        Post("/api/assets");
    }

    public override async Task HandleAsync(CreateAssetRequest req, CancellationToken ct)
    {
        var asset = await netWorthService.CreateAssetAsync(req, ct);
        await Send.ResultAsync(Results.Created($"/api/assets/{asset.Id}", asset));
    }
}
