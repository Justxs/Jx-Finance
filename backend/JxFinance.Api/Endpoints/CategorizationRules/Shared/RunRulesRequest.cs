namespace JxFinance.Endpoints.CategorizationRules.Shared;

public sealed record RunRulesRequest(Guid? AccountId = null, bool Recategorize = false);
