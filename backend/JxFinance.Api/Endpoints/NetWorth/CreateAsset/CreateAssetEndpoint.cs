using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.CreateAsset;

public sealed class CreateAssetEndpoint(IAssetService assetService) : Endpoint<CreateAssetRequest, AssetResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Assets);
        Group<NetWorthGroup>();
        Description(d => d.ProducesCreated<AssetResponse>());
    }

    public override async Task HandleAsync(CreateAssetRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(await assetService.CreateAssetAsync(req, ct), asset => asset.Id, ct);
}
