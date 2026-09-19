using FastEndpoints;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Budgets.CreateBudget;
using JxFinance.Endpoints.Budgets.Shared;
using JxFinance.Endpoints.Budgets.UpdateBudget;

namespace JxFinance.Endpoints.Budgets.Mappers;

[RegisterService<BudgetMapper>(LifeTime.Singleton)]
public sealed class BudgetMapper : Mapper<CreateBudgetRequest, BudgetResponse, Budget>
{
    public override Budget ToEntity(CreateBudgetRequest request) => new()
    {
        CategoryId = new CategoryId(request.CategoryId),
        LimitAmount = new Money(request.LimitAmount),
    };

    public void UpdateEntity(UpdateBudgetRequest request, Budget budget)
    {
        budget.CategoryId = new CategoryId(request.CategoryId);
        budget.LimitAmount = new Money(request.LimitAmount);
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
