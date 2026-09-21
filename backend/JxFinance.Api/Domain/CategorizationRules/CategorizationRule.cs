using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.CategorizationRules;

public sealed class CategorizationRule : OwnableEntity
{
    public CategorizationRuleId Id { get; set; } = CategorizationRuleId.New();
    public required string Name { get; set; }
    public int Position { get; set; }
    public DescriptionMatch Match { get; set; }
    public required string Pattern { get; set; }
    public AccountId? AccountId { get; set; }
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
    public CategoryId? CategoryId { get; set; }
}
