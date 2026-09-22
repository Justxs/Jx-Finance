using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.GetHouseholds;

public sealed class GetHouseholdsEndpoint(IHouseholdService householdService)
    : EndpointWithoutRequest<IReadOnlyList<HouseholdResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Households);
        Group<HouseholdsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var households = await householdService.GetAllAsync(ct);
        await Send.OkAsync(households, ct);
    }
}
