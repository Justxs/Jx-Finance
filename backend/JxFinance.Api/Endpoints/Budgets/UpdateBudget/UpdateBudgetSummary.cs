using FastEndpoints;
using JxFinance.Domain.Budgets;

namespace JxFinance.Endpoints.Budgets.UpdateBudget;

public sealed class UpdateBudgetSummary : Summary<UpdateBudgetEndpoint, UpdateBudgetRequest>
{
    public UpdateBudgetSummary()
    {
        Summary = "Update a budget";
        Description = "Changes the limit, the period or the rollover switch, or moves the budget to a "
            + "different category. Spending already recorded is re-evaluated against the new window the "
            + "next time the budget is read.";
        ExampleRequest = new UpdateBudgetRequest(Guid.Empty, Guid.Empty, 450.00m, BudgetPeriod.Monthly, true);
        Params["id"] = "The budget id. Takes precedence over the id in the body.";
        RequestParam(r => r.Period, "Weekly, Monthly, Quarterly, or Yearly. Defaults to Monthly.");
        RequestParam(r => r.RolloverEnabled, "Whether the previous window's remainder adjusts this window's limit.");
        Responses[200] = "The updated budget.";
        Responses[400] = "Validation failed, or the category is not visible to you.";
        Responses[404] = "No such budget is visible to the signed-in user.";
        Responses[409] = "Another budget already covers that category for the same period.";
    }
}
