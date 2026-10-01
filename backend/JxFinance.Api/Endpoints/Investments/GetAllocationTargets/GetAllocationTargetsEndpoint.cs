using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.GetAllocationTargets;

public sealed class GetAllocationTargetsEndpoint(IAllocationTargetService targets)
    : EndpointWithoutRequest<AllocationTargetsResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Investments + "/allocation-targets");
        Group<InvestmentsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await targets.GetAsync(ct), ct);
}
