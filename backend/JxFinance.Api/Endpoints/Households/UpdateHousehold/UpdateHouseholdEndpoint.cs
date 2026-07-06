using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Households.UpdateHousehold;

public sealed class UpdateHouseholdEndpoint(IHouseholdService householdService)
    : Endpoint<UpdateHouseholdRequest, HouseholdResponse>
{
    public override void Configure()
    {
        Put("/api/households/{id}");
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateHouseholdRequest req, CancellationToken ct)
    {
        var result = await householdService.UpdateAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
