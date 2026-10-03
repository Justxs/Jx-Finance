using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.SetAssetValuation;

public sealed class SetAssetValuationEndpoint(IAssetService assetService)
    : Endpoint<SetAssetValuationRequest, AssetResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Assets + "/{id}/valuations/{date}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(SetAssetValuationRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await assetService.SetValuationAsync(req, ct), ct);
}
