using FastEndpoints;

namespace JxFinance.Endpoints.Budgets.UpdateBudget;

public sealed class UpdateBudgetSummary : Summary<UpdateBudgetEndpoint, UpdateBudgetRequest>
{
    public UpdateBudgetSummary()
    {
        Summary = "Update a budget";
        Description = "Changes the limit, or moves the budget to a different category. Spending already "
            + "recorded is re-evaluated against the new limit the next time the budget is read.";
        ExampleRequest = new UpdateBudgetRequest(Guid.Empty, Guid.Empty, 450.00m);
        Params["id"] = "The budget id. Takes precedence over the id in the body.";
        Responses[200] = "The updated budget.";
        Responses[400] = "Validation failed, or the category is not visible to you.";
        Responses[404] = "No such budget is visible to the signed-in user.";
    }
}
