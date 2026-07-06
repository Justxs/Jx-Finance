using FastEndpoints;
using JxFinance.Endpoints.Households.GetHousehold;

namespace JxFinance.Endpoints.Households.CreateHousehold;

public sealed class CreateHouseholdEndpoint(IHouseholdService householdService)
    : Endpoint<CreateHouseholdRequest, HouseholdResponse>
{
    public override void Configure()
    {
        Post("/api/households");
    }

    public override async Task HandleAsync(CreateHouseholdRequest req, CancellationToken ct)
    {
        var household = await householdService.CreateAsync(req, ct);
        await Send.CreatedAtAsync<GetHouseholdEndpoint>(new { id = household.Id }, household, cancellation: ct);
    }
}
