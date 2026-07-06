using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.NetWorth.DeleteAsset;

public sealed class DeleteAssetEndpoint(INetWorthService netWorthService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/api/assets/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await netWorthService.DeleteAssetAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
