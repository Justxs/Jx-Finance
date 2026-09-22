using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Households.Interfaces;

namespace JxFinance.Endpoints.Households.DeleteHousehold;

public sealed class DeleteHouseholdEndpoint(IHouseholdService householdService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Households + "/{id}");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        householdService.DeleteAsync(id, ct);
}
