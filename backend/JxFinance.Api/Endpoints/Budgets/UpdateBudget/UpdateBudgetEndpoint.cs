using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Budgets.UpdateBudget;

public sealed class UpdateBudgetEndpoint(IBudgetService budgetService) : Endpoint<UpdateBudgetRequest, BudgetResponse>
{
    public override void Configure()
    {
        Put("/api/budgets/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateBudgetRequest req, CancellationToken ct)
    {
        var result = await budgetService.UpdateAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
