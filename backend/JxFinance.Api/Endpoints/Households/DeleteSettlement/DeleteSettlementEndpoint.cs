using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Households.Interfaces;

namespace JxFinance.Endpoints.Households.DeleteSettlement;

public sealed class DeleteSettlementEndpoint(ISettleUpService settleUpService) : DeleteEndpoint
{
    private const string HouseholdParameter = "id";

    protected override string IdParameter => "settlementId";

    public override void Configure()
    {
        Delete(ApiRoutes.Households + "/{id}/settlements/{settlementId}");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        settleUpService.DeleteSettlementAsync(Route<Guid>(HouseholdParameter), id, ct);
}
