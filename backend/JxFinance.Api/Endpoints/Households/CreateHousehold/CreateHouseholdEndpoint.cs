using FastEndpoints;
using JxFinance.Endpoints.Households.GetHousehold;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.CreateHousehold;

public sealed class CreateHouseholdEndpoint(IHouseholdService householdService)
    : Endpoint<CreateHouseholdRequest, HouseholdResponse>
{
    public override void Configure()
    {
        Post("households");
        Group<HouseholdsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<HouseholdResponse>(201, "application/json"));
    }

    public override async Task HandleAsync(CreateHouseholdRequest req, CancellationToken ct)
    {
        var household = await householdService.CreateAsync(req, ct);
        await Send.CreatedAtAsync<GetHouseholdEndpoint>(new { id = household.Id }, household, cancellation: ct);
    }
}
