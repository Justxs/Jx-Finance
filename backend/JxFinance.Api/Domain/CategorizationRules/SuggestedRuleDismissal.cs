using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.CategorizationRules;

public sealed class SuggestedRuleDismissal : OwnableEntity
{
    public SuggestedRuleDismissalId Id { get; set; } = SuggestedRuleDismissalId.New();
    public required string Key { get; set; }
    public CategoryId CategoryId { get; set; }
}
