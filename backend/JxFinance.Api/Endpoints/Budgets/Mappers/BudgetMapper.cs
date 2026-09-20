using FastEndpoints;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Budgets.CreateBudget;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.Mappers;

[RegisterService<BudgetMapper>(LifeTime.Singleton)]
public sealed class BudgetMapper : Mapper<CreateBudgetRequest, BudgetResponse, Budget>
{
    public override Budget ToEntity(CreateBudgetRequest request)
    {
        var budget = new Budget();
        Apply(request, budget);
        return budget;
    }

    public void Apply(IBudgetInput input, Budget budget)
    {
        budget.CategoryId = new CategoryId(input.CategoryId);
        budget.LimitAmount = new Money(input.LimitAmount);
    }

    public BudgetResponse FromEntity(Budget budget, string? categoryName, decimal spent)
    {
        var limit = (decimal)budget.LimitAmount;
        return new BudgetResponse(
            budget.Id.Value,
            budget.CategoryId.Value,
            categoryName ?? "Unknown",
            budget.LimitAmount.Amount,
            spent,
            limit - spent,
            budget.Period.ToString());
    }
}
