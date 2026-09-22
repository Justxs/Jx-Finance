using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.CreateAsset;

public sealed class CreateAssetEndpoint(INetWorthService netWorthService) : Endpoint<CreateAssetRequest, AssetResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Assets);
        Group<NetWorthGroup>();
        Description(d => d.ProducesCreated<AssetResponse>());
    }

    public override async Task HandleAsync(CreateAssetRequest req, CancellationToken ct)
    {
        await Send.CreatedOrProblemAsync(await netWorthService.CreateAssetAsync(req, ct), asset => $"{ApiRoutes.AssetsPath}/{asset.Id}", ct);
    }
}
