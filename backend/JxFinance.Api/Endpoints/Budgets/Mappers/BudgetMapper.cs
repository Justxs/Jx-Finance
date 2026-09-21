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
        budget.Period = input.Period;
        budget.RolloverEnabled = input.RolloverEnabled;
    }

    public BudgetResponse FromEntity(Budget budget, string? categoryName, BudgetUsage usage)
    {
        var limit = budget.LimitAmount.Amount;
        var effectiveLimit = limit + usage.Carried;
        return new BudgetResponse(
            budget.Id.Value,
            budget.CategoryId.Value,
            categoryName ?? "Unknown",
            limit,
            usage.Carried,
            effectiveLimit,
            usage.Spent,
            effectiveLimit - usage.Spent,
            budget.Period,
            budget.RolloverEnabled,
            usage.Window.Start,
            usage.Window.LastDay);
    }
}
