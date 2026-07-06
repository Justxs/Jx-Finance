using FastEndpoints;

namespace JxFinance.Endpoints.Households.GetHouseholds;

public sealed class GetHouseholdsEndpoint(IHouseholdService householdService)
    : EndpointWithoutRequest<IReadOnlyList<HouseholdResponse>>
{
    public override void Configure()
    {
        Get("/api/households");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var households = await householdService.GetAllAsync(ct);
        await Send.OkAsync(households, ct);
    }
}
