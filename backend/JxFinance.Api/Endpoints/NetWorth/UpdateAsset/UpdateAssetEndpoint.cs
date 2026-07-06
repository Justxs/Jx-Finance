using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.NetWorth.UpdateAsset;

public sealed class UpdateAssetEndpoint(INetWorthService netWorthService) : Endpoint<UpdateAssetRequest, AssetResponse>
{
    public override void Configure()
    {
        Put("/api/assets/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateAssetRequest req, CancellationToken ct)
    {
        var result = await netWorthService.UpdateAssetAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
