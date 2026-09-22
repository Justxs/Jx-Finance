using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
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
        var budget = (await budgetService.UpdateAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(budget, ct);
    }
}
