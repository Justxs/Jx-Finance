using FastEndpoints;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Mappers;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.CreateAsset;

public sealed class CreateAssetEndpoint(INetWorthService netWorthService) : Endpoint<CreateAssetRequest, AssetResponse, AssetMapper>
{
    public override void Configure()
    {
        Post("assets");
        Group<NetWorthGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<AssetResponse>(201, "application/json"));
    }

    public override async Task HandleAsync(CreateAssetRequest req, CancellationToken ct)
    {
        var asset = Map.FromEntity(await netWorthService.CreateAssetAsync(Map.ToEntity(req), ct));
        await Send.ResultAsync(TypedResults.Created($"/api/assets/{asset.Id}", asset));
    }
}
