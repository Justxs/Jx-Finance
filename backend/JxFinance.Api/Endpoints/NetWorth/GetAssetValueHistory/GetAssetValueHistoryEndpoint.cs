using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.GetAssetValueHistory;

public sealed class GetAssetValueHistoryEndpoint(IAssetService assetService)
    : Endpoint<GetAssetValueHistoryRequest, AssetValueHistoryResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Assets + "/{id}/value-history");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetAssetValueHistoryRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await assetService.GetValueHistoryAsync(req, ct), ct);
}
