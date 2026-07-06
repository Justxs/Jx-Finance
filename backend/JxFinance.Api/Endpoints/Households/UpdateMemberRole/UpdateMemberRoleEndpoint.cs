using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Households.UpdateMemberRole;

public sealed class UpdateMemberRoleEndpoint(IHouseholdService householdService)
    : Endpoint<UpdateMemberRoleRequest, HouseholdResponse>
{
    public override void Configure()
    {
        Put("/api/households/{id}/members/{userId}");
        Description(d => d.ProducesProblemDetails(400).ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateMemberRoleRequest req, CancellationToken ct)
    {
        var result = await householdService.UpdateMemberRoleAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
