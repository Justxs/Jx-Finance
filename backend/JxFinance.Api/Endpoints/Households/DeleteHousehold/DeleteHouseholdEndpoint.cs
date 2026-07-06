using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Households.DeleteHousehold;

public sealed class DeleteHouseholdEndpoint(IHouseholdService householdService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/api/households/{id}");
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await householdService.DeleteAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
