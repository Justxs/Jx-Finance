using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.Budgets;

public sealed class Budget : OwnableEntity
{
    public BudgetId Id { get; set; } = BudgetId.New();
    public CategoryId CategoryId { get; set; }
    public Money LimitAmount { get; set; }
    public BudgetPeriod Period { get; set; } = BudgetPeriod.Monthly;
    public bool RolloverEnabled { get; set; }
}
