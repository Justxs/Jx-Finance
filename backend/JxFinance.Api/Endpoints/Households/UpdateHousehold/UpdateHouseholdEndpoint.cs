using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.UpdateHousehold;

public sealed class UpdateHouseholdEndpoint(IHouseholdService householdService)
    : Endpoint<UpdateHouseholdRequest, HouseholdResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Households + "/{id}");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateHouseholdRequest req, CancellationToken ct)
    {
        await Send.OkOrProblemAsync(await householdService.UpdateAsync(req, ct), ct);
    }
}
