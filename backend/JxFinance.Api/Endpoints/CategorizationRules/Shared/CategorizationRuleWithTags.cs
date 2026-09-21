using JxFinance.Domain.CategorizationRules;

namespace JxFinance.Endpoints.CategorizationRules.Shared;

public sealed record CategorizationRuleWithTags(CategorizationRule Rule, IReadOnlyList<Guid> TagIds);
