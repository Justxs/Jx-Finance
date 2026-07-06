using JxFinance.Domain.Common;

namespace JxFinance.Domain.Households;

public sealed class HouseholdMembership : EntityBase
{
    public HouseholdMembershipId Id { get; set; } = HouseholdMembershipId.New();
    public HouseholdId HouseholdId { get; set; }
    public Guid UserId { get; set; }
    public HouseholdRole Role { get; set; }
}
