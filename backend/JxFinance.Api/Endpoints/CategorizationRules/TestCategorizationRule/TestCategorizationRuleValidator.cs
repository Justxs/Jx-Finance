using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.TestCategorizationRule;

public sealed class TestCategorizationRuleValidator : Validator<TestCategorizationRuleRequest>
{
    public TestCategorizationRuleValidator()
    {
        RuleFor(r => r.Match).IsKnownEnum();
        RuleFor(r => r.Pattern).IsRequired().HasMaxLength(RuleLimits.PatternMaxLength);
        RuleFor(r => r.Description).IsRequired().HasMaxLength(RuleLimits.DescriptionMaxLength);
        RuleFor(r => r.Amount).IsNonNegativeMoney();
        RuleFor(r => r.MinAmount).IsNonNegativeMoney();
        RuleFor(r => r.MaxAmount).IsNonNegativeMoney();
    }
}
