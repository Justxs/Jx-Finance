using JxFinance.Domain.Common;

namespace JxFinance.Domain.CategorizationRules;

public readonly record struct CategorizationRuleId(Guid Value) : IStronglyTypedId<CategorizationRuleId>
{
    public static CategorizationRuleId From(Guid value) => new(value);

    public static CategorizationRuleId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
