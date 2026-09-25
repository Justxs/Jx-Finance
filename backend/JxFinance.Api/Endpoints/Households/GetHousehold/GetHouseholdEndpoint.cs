using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.GetHousehold;

public sealed class GetHouseholdEndpoint(IHouseholdService householdService)
    : EndpointWithoutRequest<HouseholdResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Households + "/{id}");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkOrProblemAsync(await householdService.GetByIdAsync(Route<Guid>("id"), ct), ct);
}
