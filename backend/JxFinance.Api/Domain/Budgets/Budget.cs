using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Tags;

namespace JxFinance.Domain.Budgets;

public sealed class Budget : OwnableEntity, IShareable, IVersioned
{
    public BudgetId Id { get; set; } = BudgetId.New();
    public CategoryId? CategoryId { get; set; }
    public TagId? TagId { get; set; }
    public Money LimitAmount { get; set; }
    public BudgetPeriod Period { get; set; } = BudgetPeriod.Monthly;
    public bool RolloverEnabled { get; set; }
    public Scope Scope { get; set; } = Scope.Personal;
    public HouseholdId? HouseholdId { get; set; }
    public uint Version { get; set; }
}
