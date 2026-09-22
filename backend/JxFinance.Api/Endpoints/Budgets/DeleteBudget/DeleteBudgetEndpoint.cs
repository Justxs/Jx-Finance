using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Budgets.Interfaces;

namespace JxFinance.Endpoints.Budgets.DeleteBudget;

public sealed class DeleteBudgetEndpoint(IBudgetService budgetService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Budgets + "/{id}");
        Group<BudgetsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        budgetService.DeleteAsync(id, ct);
}
