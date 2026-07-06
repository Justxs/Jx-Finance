using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Households.RemoveMember;

public sealed class RemoveMemberEndpoint(IHouseholdService householdService) : EndpointWithoutRequest<HouseholdResponse>
{
    public override void Configure()
    {
        Delete("/api/households/{id}/members/{userId}");
        Description(d => d.ProducesProblemDetails(400).ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await householdService.RemoveMemberAsync(Route<Guid>("id"), Route<Guid>("userId"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
