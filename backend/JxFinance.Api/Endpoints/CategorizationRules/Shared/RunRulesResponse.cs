namespace JxFinance.Endpoints.CategorizationRules.Shared;

public sealed record RunRulesResponse(IReadOnlyList<RunRulesRow> Rules, int Total, bool Recategorize);

public sealed record RunRulesRow(Guid RuleId, string Name, int RowCount);
