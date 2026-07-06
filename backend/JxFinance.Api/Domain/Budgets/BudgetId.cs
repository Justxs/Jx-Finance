namespace JxFinance.Domain.Budgets;

public readonly record struct BudgetId(Guid Value)
{
    public static BudgetId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
