using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.MoveCategorizationRule;

public sealed record MoveCategorizationRuleRequest(Guid Id, MoveDirection Direction);
