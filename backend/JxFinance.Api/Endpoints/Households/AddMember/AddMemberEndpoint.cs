using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.AddMember;

public sealed class AddMemberEndpoint(IHouseholdService householdService)
    : Endpoint<AddMemberRequest, HouseholdResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Households + "/{id}/members");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(AddMemberRequest req, CancellationToken ct)
    {
        var household = (await householdService.AddMemberAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(household, ct);
    }
}
