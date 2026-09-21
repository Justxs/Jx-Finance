using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.CategorizationRules.MoveCategorizationRule;

public sealed class MoveCategorizationRuleValidator : Validator<MoveCategorizationRuleRequest>
{
    public MoveCategorizationRuleValidator()
    {
        RuleFor(r => r.Direction).IsKnownEnum();
    }
}
