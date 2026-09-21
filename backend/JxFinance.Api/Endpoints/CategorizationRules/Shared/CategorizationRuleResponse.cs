using JxFinance.Common.Json;
using JxFinance.Domain.CategorizationRules;

namespace JxFinance.Endpoints.CategorizationRules.Shared;

public sealed record CategorizationRuleResponse(
    Guid Id,
    string Name,
    int Position,
    DescriptionMatch Match,
    string Pattern,
    Guid? AccountId,
    [property: Money] decimal? MinAmount,
    [property: Money] decimal? MaxAmount,
    Guid? CategoryId,
    IReadOnlyList<Guid> TagIds);
