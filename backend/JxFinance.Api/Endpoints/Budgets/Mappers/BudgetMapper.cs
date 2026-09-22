using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Budgets.CreateBudget;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.Mappers;

public static class BudgetMapper
{
    public static Budget ToEntity(this CreateBudgetRequest request, Currency reportingCurrency)
    {
        var budget = new Budget();
        request.ApplyTo(budget, reportingCurrency);
        return budget;
    }

    public static void ApplyTo(this IBudgetInput input, Budget budget, Currency reportingCurrency)
    {
        budget.CategoryId = new CategoryId(input.CategoryId);
        budget.LimitAmount = new Money(input.LimitAmount, reportingCurrency);
        budget.Period = input.Period;
        budget.RolloverEnabled = input.RolloverEnabled;
    }

    public static BudgetResponse ToResponse(this Budget budget, string? categoryName, BudgetUsage usage)
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
