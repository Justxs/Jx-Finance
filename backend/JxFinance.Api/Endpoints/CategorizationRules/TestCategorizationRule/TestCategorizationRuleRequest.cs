using JxFinance.Common.Json;
using JxFinance.Domain.CategorizationRules;

namespace JxFinance.Endpoints.CategorizationRules.TestCategorizationRule;

public sealed record TestCategorizationRuleRequest(
    DescriptionMatch Match,
    string Pattern,
    string Description,
    [property: Money] decimal? Amount = null,
    [property: Money] decimal? MinAmount = null,
    [property: Money] decimal? MaxAmount = null);
