using FastEndpoints;

namespace JxFinance.Endpoints.Budgets.DeleteBudget;

public sealed class DeleteBudgetSummary : Summary<DeleteBudgetEndpoint>
{
    public DeleteBudgetSummary()
    {
        Summary = "Delete a budget";
        Description = "Removes the spending limit. Transactions in the category are untouched.";
        Params["id"] = "The budget id.";
        Responses[204] = "The budget is gone.";
        Responses[404] = "No such budget is visible to the signed-in user.";
    }
}
