using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.Budgets.CreateBudget;

public sealed class CreateBudgetSummary : Summary<CreateBudgetEndpoint, CreateBudgetRequest>
{
    public CreateBudgetSummary()
    {
        Summary = "Create a budget";
        Description = "Sets a spending limit for one category. A category can carry a single budget, so "
            + "creating a second one for the same category is rejected.";
        ExampleRequest = new CreateBudgetRequest(Guid.Empty, 400.00m);
        RequestParam(r => r.CategoryId, "The category the limit applies to; must be visible to you.");
        RequestParam(r => r.LimitAmount, SummaryText.PositiveMoney);
        Responses[201] = "The budget was created. The Location header points at it.";
        Responses[400] = "Validation failed, the category is not visible to you, or it already has a budget.";
    }
}
