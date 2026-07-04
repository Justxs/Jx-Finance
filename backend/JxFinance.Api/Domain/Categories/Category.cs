using JxFinance.Domain.Common;

namespace JxFinance.Domain.Categories;

public sealed class Category : OwnableEntity
{
    public CategoryId Id { get; set; } = CategoryId.New();
    public required string Name { get; set; }
    public FlowType Type { get; set; }
    public string? Icon { get; set; }
    public bool IsDefault { get; set; }
}
