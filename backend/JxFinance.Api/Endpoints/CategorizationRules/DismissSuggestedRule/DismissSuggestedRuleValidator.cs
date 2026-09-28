using FastEndpoints;
using JxFinance.Common.Subscriptions;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.CategorizationRules.DismissSuggestedRule;

public sealed class DismissSuggestedRuleValidator : Validator<DismissSuggestedRuleRequest>
{
    public DismissSuggestedRuleValidator()
    {
        RuleFor(r => r.Key).IsRequired().HasMaxLength(SubscriptionDescription.MaxLength);
        RuleFor(r => r.CategoryId).IsRequired();
    }
}
