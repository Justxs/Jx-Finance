using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.GetBudgets;

public sealed class GetBudgetsEndpoint(IBudgetService budgetService)
    : Endpoint<GetBudgetsRequest, IReadOnlyList<BudgetResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Budgets);
        Group<BudgetsGroup>();
    }

    public override async Task HandleAsync(GetBudgetsRequest req, CancellationToken ct) =>
        await Send.OkAsync(await budgetService.GetAllAsync(req.AsOf, ct), ct);
}
