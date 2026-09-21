using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Budgets;

namespace JxFinance.Endpoints.Budgets.CreateBudget;

public sealed class CreateBudgetSummary : Summary<CreateBudgetEndpoint, CreateBudgetRequest>
{
    public CreateBudgetSummary()
    {
        Summary = "Create a budget";
        Description = "Sets a spending limit for one category over a weekly, monthly, quarterly or yearly "
            + "window. A category can carry one budget per period, so a second budget for the same category "
            + "and period is rejected; the same category may hold, say, a weekly and a yearly budget at once.";
        ExampleRequest = new CreateBudgetRequest(Guid.Empty, 400.00m, BudgetPeriod.Monthly, false);
        RequestParam(r => r.CategoryId, "The category the limit applies to; must be visible to you.");
        RequestParam(r => r.LimitAmount, SummaryText.PositiveMoney);
        RequestParam(r => r.Period, "Weekly, Monthly, Quarterly, or Yearly. Defaults to Monthly.");
        RequestParam(
            r => r.RolloverEnabled,
            "When true, what is left of the previous window raises this window's limit and an overspend "
                + "lowers it, walking back at most twelve windows or to the budget's creation.");
        Responses[201] = "The budget was created. The Location header points at it.";
        Responses[400] = "Validation failed, or the category is not visible to you.";
        Responses[409] = "That category already has a budget for the same period.";
    }
}
