using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;

namespace JxFinance.Endpoints.NetWorth.DeleteAssetValuation;

public sealed class DeleteAssetValuationEndpoint(IAssetService assetService) : Endpoint<DeleteAssetValuationRequest>
{
    public override void Configure()
    {
        Delete(ApiRoutes.Assets + "/{id}/valuations/{date}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(400).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(DeleteAssetValuationRequest req, CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await assetService.DeleteValuationAsync(req, ct), ct);
}
