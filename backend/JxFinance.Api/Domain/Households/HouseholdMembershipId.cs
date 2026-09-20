using JxFinance.Domain.Common;

namespace JxFinance.Domain.Households;

public readonly record struct HouseholdMembershipId(Guid Value) : IStronglyTypedId<HouseholdMembershipId>
{
    public static HouseholdMembershipId From(Guid value) => new(value);

    public static HouseholdMembershipId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
