using JxFinance.Domain.Common;

namespace JxFinance.Domain.CategorizationRules;

public readonly record struct SuggestedRuleDismissalId(Guid Value) : IStronglyTypedId<SuggestedRuleDismissalId>
{
    public static SuggestedRuleDismissalId From(Guid value) => new(value);

    public static SuggestedRuleDismissalId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
