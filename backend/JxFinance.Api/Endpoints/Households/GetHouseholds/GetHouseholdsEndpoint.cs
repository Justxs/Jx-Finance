using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Settings;
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
        Options(b => b.WithMetadata(EmptyWhenFeatureOff.Instance));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await householdService.GetAllAsync(ct), ct);
}
