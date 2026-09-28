using JxFinance.Domain.CategorizationRules;

namespace JxFinance.Endpoints.CategorizationRules.Shared;

public sealed record SuggestedRuleResponse(
    string Key,
    string Name,
    DescriptionMatch Match,
    string Pattern,
    Guid CategoryId,
    int Evidence,
    DateOnly LastSeen);
