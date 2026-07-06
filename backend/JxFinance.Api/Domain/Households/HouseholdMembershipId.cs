namespace JxFinance.Domain.Households;

public readonly record struct HouseholdMembershipId(Guid Value)
{
    public static HouseholdMembershipId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
