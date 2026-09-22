using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.CreateBudget;

public sealed class CreateBudgetEndpoint(IBudgetService budgetService) : Endpoint<CreateBudgetRequest, BudgetResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Budgets);
        Group<BudgetsGroup>();
        Description(d => d
            .ProducesCreated<BudgetResponse>()
            .ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(CreateBudgetRequest req, CancellationToken ct)
    {
        await Send.CreatedOrProblemAsync(await budgetService.CreateAsync(req, ct), budget => $"{ApiRoutes.BudgetsPath}/{budget.Id}", ct);
    }
}
