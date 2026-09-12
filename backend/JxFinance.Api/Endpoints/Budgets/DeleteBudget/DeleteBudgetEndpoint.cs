using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Budgets.Interfaces;

namespace JxFinance.Endpoints.Budgets.DeleteBudget;

public sealed class DeleteBudgetEndpoint(IBudgetService budgetService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("budgets/{id}");
        Group<BudgetsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await budgetService.DeleteAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
