using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.GetAssetValuations;

public sealed class GetAssetValuationsEndpoint(INetWorthService netWorthService)
    : Endpoint<GetAssetValuationsRequest, IReadOnlyList<AssetValuationResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Assets + "/{id}/valuations");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetAssetValuationsRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await netWorthService.GetValuationsAsync(req.Id, ct), ct);
}
