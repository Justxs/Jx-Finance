using FastEndpoints;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.CreateAsset;

public sealed class CreateAssetEndpoint(INetWorthService netWorthService) : Endpoint<CreateAssetRequest, AssetResponse>
{
    public override void Configure()
    {
        Post("assets");
        Group<NetWorthGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<AssetResponse>(201, "application/json"));
    }

    public override async Task HandleAsync(CreateAssetRequest req, CancellationToken ct)
    {
        var asset = await netWorthService.CreateAssetAsync(req, ct);
        await Send.ResultAsync(TypedResults.Created($"/api/assets/{asset.Id}", asset));
    }
}
