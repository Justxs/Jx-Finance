using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Households.GetHousehold;

public sealed class GetHouseholdEndpoint(IHouseholdService householdService)
    : EndpointWithoutRequest<HouseholdResponse>
{
    public override void Configure()
    {
        Get("/api/households/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await householdService.GetByIdAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
