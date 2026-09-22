using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.UpdateMemberRole;

public sealed class UpdateMemberRoleEndpoint(IHouseholdService householdService)
    : Endpoint<UpdateMemberRoleRequest, HouseholdResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Households + "/{id}/members/{userId}");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateMemberRoleRequest req, CancellationToken ct)
    {
        var household = (await householdService.UpdateMemberRoleAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(household, ct);
    }
}
