using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Mappers;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.CreateAsset;

public sealed class CreateAssetEndpoint(INetWorthService netWorthService) : Endpoint<CreateAssetRequest, AssetResponse, AssetMapper>
{
    public override void Configure()
    {
        Post(ApiRoutes.Assets);
        Group<NetWorthGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<AssetResponse>(201, MediaTypeNames.Application.Json));
    }

    public override async Task HandleAsync(CreateAssetRequest req, CancellationToken ct)
    {
        var asset = Map.FromEntity(await netWorthService.CreateAssetAsync(Map.ToEntity(req), ct));
        await Send.ResultAsync(TypedResults.Created($"{ApiRoutes.AssetsPath}/{asset.Id}", asset));
    }
}
