using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.NetWorth.Interfaces;

namespace JxFinance.Endpoints.NetWorth.DeleteAsset;

public sealed class DeleteAssetEndpoint(INetWorthService netWorthService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("assets/{id}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await netWorthService.DeleteAssetAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
