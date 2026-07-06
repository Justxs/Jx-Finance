using JxFinance.Domain.Common;
using JxFinance.Domain.Households;

namespace JxFinance.Domain.Categories;

public sealed class Category : OwnableEntity, IShareable
{
    public CategoryId Id { get; set; } = CategoryId.New();
    public required string Name { get; set; }
    public FlowType Type { get; set; }
    public string? Icon { get; set; }
    public bool IsDefault { get; set; }
    public Scope Scope { get; set; } = Scope.Personal;
    public HouseholdId? HouseholdId { get; set; }
}
