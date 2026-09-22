using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.UpdateBudget;

public sealed class UpdateBudgetEndpoint(IBudgetService budgetService) : Endpoint<UpdateBudgetRequest, BudgetResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Budgets + "/{id}");
        Group<BudgetsGroup>();
        Description(d => d.ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(UpdateBudgetRequest req, CancellationToken ct)
    {
        await Send.OkOrProblemAsync(await budgetService.UpdateAsync(req, ct), ct);
    }
}
