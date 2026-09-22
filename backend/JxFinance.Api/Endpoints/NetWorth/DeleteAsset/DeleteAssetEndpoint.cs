using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;

namespace JxFinance.Endpoints.NetWorth.DeleteAsset;

public sealed class DeleteAssetEndpoint(INetWorthService netWorthService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Assets + "/{id}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        netWorthService.DeleteAssetAsync(id, ct);
}
