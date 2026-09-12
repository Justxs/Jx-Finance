using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Households.Interfaces;

namespace JxFinance.Endpoints.Households.DeleteHousehold;

public sealed class DeleteHouseholdEndpoint(IHouseholdService householdService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("households/{id}");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await householdService.DeleteAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
