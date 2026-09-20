using JxFinance.Domain.Common;

namespace JxFinance.Domain.Budgets;

public readonly record struct BudgetId(Guid Value) : IStronglyTypedId<BudgetId>
{
    public static BudgetId From(Guid value) => new(value);

    public static BudgetId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
