using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Households.Interfaces;

namespace JxFinance.Endpoints.Households.DeleteSharedExpense;

public sealed class DeleteSharedExpenseEndpoint(ISettleUpService settleUpService) : DeleteEndpoint
{
    private const string HouseholdParameter = "id";

    protected override string IdParameter => "expenseId";

    public override void Configure()
    {
        Delete(ApiRoutes.Households + "/{id}/shared-expenses/{expenseId}");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        settleUpService.DeleteSharedExpenseAsync(Route<Guid>(HouseholdParameter), id, ct);
}
