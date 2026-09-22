using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.RemoveMember;

public sealed class RemoveMemberEndpoint(IHouseholdService householdService) : EndpointWithoutRequest<HouseholdResponse>
{
    public override void Configure()
    {
        Delete(ApiRoutes.Households + "/{id}/members/{userId}");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var household = (await householdService.RemoveMemberAsync(Route<Guid>("id"), Route<Guid>("userId"), ct))
            .ValueOrThrow();
        await Send.OkAsync(household, ct);
    }
}
