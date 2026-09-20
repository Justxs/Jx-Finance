using JxFinance.Domain.Common;

namespace JxFinance.Domain.Goals;

public readonly record struct GoalId(Guid Value) : IStronglyTypedId<GoalId>
{
    public static GoalId From(Guid value) => new(value);

    public static GoalId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
