using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.UpdateAsset;

public sealed class UpdateAssetEndpoint(INetWorthService netWorthService) : Endpoint<UpdateAssetRequest, AssetResponse>
{
    public override void Configure()
    {
        Put("assets/{id}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateAssetRequest req, CancellationToken ct)
    {
        var asset = (await netWorthService.UpdateAssetAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(asset, ct);
    }
}
