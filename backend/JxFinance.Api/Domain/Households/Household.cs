using JxFinance.Domain.Common;

namespace JxFinance.Domain.Households;

public sealed class Household : EntityBase
{
    public HouseholdId Id { get; set; } = HouseholdId.New();
    public required string Name { get; set; }
}
