using FastEndpoints;

namespace JxFinance.Endpoints.Budgets.GetBudgets;

public sealed class GetBudgetsEndpoint(IBudgetService budgetService) : EndpointWithoutRequest<IReadOnlyList<BudgetResponse>>
{
    public override void Configure()
    {
        Get("/api/budgets");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var budgets = await budgetService.GetAllAsync(ct);
        await Send.OkAsync(budgets, ct);
    }
}
