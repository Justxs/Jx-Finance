using JxFinance.Domain.Common;

namespace JxFinance.Domain.Households;

public readonly record struct SharedExpenseId(Guid Value) : IStronglyTypedId<SharedExpenseId>
{
    public static SharedExpenseId From(Guid value) => new(value);

    public static SharedExpenseId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
