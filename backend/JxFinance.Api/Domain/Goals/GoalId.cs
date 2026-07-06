namespace JxFinance.Domain.Goals;

public readonly record struct GoalId(Guid Value)
{
    public static GoalId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
