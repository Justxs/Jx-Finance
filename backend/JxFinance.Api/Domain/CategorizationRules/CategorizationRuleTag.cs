using JxFinance.Domain.Tags;

namespace JxFinance.Domain.CategorizationRules;

public sealed class CategorizationRuleTag
{
    public CategorizationRuleId RuleId { get; set; }
    public TagId TagId { get; set; }
}
