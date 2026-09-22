using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.CreateHousehold;

public sealed class CreateHouseholdEndpoint(IHouseholdService householdService)
    : Endpoint<CreateHouseholdRequest, HouseholdResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Households);
        Group<HouseholdsGroup>();
        Description(d => d.ProducesCreated<HouseholdResponse>());
    }

    public override async Task HandleAsync(CreateHouseholdRequest req, CancellationToken ct)
    {
        await Send.CreatedOrProblemAsync(await householdService.CreateAsync(req, ct), household => $"{ApiRoutes.HouseholdsPath}/{household.Id}", ct);
    }
}
