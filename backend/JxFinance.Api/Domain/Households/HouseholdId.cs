using JxFinance.Domain.Common;

namespace JxFinance.Domain.Households;

public readonly record struct HouseholdId(Guid Value) : IStronglyTypedId<HouseholdId>
{
    public static HouseholdId From(Guid value) => new(value);

    public static HouseholdId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
