using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Budgets.CreateBudget;

public sealed class CreateBudgetEndpoint(IBudgetService budgetService) : Endpoint<CreateBudgetRequest, BudgetResponse>
{
    public override void Configure()
    {
        Post("/api/budgets");
    }

    public override async Task HandleAsync(CreateBudgetRequest req, CancellationToken ct)
    {
        var result = await budgetService.CreateAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.ResultAsync(Results.Created($"/api/budgets/{result.Value!.Id}", result.Value));
    }
}
