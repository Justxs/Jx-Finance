using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.GetBudgets;

public sealed class GetBudgetsEndpoint(IBudgetService budgetService) : EndpointWithoutRequest<IReadOnlyList<BudgetResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Budgets);
        Group<BudgetsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var budgets = await budgetService.GetAllAsync(ct);
        await Send.OkAsync(budgets, ct);
    }
}
