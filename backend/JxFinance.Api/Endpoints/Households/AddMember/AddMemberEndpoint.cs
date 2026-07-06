using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Households.AddMember;

public sealed class AddMemberEndpoint(IHouseholdService householdService)
    : Endpoint<AddMemberRequest, HouseholdResponse>
{
    public override void Configure()
    {
        Post("/api/households/{id}/members");
        Description(d => d.ProducesProblemDetails(400).ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(AddMemberRequest req, CancellationToken ct)
    {
        var result = await householdService.AddMemberAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
