using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.UpdateAsset;

public sealed class UpdateAssetEndpoint(IAssetService assetService) : Endpoint<UpdateAssetRequest, AssetResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Assets + "/{id}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateAssetRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await assetService.UpdateAssetAsync(req, ct), ct);
}
