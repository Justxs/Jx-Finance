using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.SaveAllocationTargets;

public sealed class SaveAllocationTargetsEndpoint(IAllocationTargetService targets)
    : Endpoint<SaveAllocationTargetsRequest, AllocationTargetsResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Investments + "/allocation-targets");
        Group<InvestmentsGroup>();
    }

    public override async Task HandleAsync(SaveAllocationTargetsRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await targets.SaveAsync(req, ct), ct);
}
