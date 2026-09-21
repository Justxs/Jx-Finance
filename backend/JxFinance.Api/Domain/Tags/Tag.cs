using JxFinance.Domain.Common;
using JxFinance.Domain.Households;

namespace JxFinance.Domain.Tags;

public sealed class Tag : OwnableEntity, IShareable
{
    public TagId Id { get; set; } = TagId.New();
    public required string Name { get; set; }
    public Scope Scope { get; set; } = Scope.Personal;
    public HouseholdId? HouseholdId { get; set; }
}
