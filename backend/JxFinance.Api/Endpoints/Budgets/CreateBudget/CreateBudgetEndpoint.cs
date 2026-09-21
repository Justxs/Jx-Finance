using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.CreateBudget;

public sealed class CreateBudgetEndpoint(IBudgetService budgetService) : Endpoint<CreateBudgetRequest, BudgetResponse>
{
    public override void Configure()
    {
        Post("budgets");
        Group<BudgetsGroup>();
        Description(d => d
            .ClearDefaultProduces(200)
            .Produces<BudgetResponse>(201, "application/json")
            .ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(CreateBudgetRequest req, CancellationToken ct)
    {
        var budget = (await budgetService.CreateAsync(req, ct)).ValueOrThrow();
        await Send.ResultAsync(TypedResults.Created($"/api/budgets/{budget.Id}", budget));
    }
}
