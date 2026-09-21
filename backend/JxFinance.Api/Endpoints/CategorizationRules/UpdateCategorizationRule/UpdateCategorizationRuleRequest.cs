using JxFinance.Common.Json;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.UpdateCategorizationRule;

public sealed record UpdateCategorizationRuleRequest(
    Guid Id,
    string Name,
    DescriptionMatch Match,
    string Pattern,
    IReadOnlyList<Guid> TagIds,
    Guid? AccountId = null,
    [property: Money] decimal? MinAmount = null,
    [property: Money] decimal? MaxAmount = null,
    Guid? CategoryId = null) : ICategorizationRuleInput;
