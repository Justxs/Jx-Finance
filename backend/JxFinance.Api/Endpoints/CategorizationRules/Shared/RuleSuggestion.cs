using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.CategorizationRules.Shared;

public sealed record RuleCandidate(string? Description, decimal Amount, FlowType Type);

public sealed record RuleSuggestion(string RuleName, Guid? CategoryId, IReadOnlyList<Guid> TagIds);
