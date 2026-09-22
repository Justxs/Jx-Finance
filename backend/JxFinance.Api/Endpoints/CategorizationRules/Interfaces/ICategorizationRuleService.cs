using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.CategorizationRules.CreateCategorizationRule;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Endpoints.CategorizationRules.UpdateCategorizationRule;

namespace JxFinance.Endpoints.CategorizationRules.Interfaces;

public interface ICategorizationRuleService
{
    Task<IReadOnlyList<CategorizationRuleResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<CategorizationRuleResponse>> CreateAsync(
        CreateCategorizationRuleRequest request,
        CancellationToken cancellationToken);

    Task<Result<CategorizationRuleResponse>> UpdateAsync(
        UpdateCategorizationRuleRequest request,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<CategorizationRuleResponse>>> MoveAsync(
        Guid id,
        MoveDirection direction,
        CancellationToken cancellationToken);

    Task<Result<RunRulesResponse>> PreviewRunAsync(RunRulesRequest request, CancellationToken cancellationToken);

    Task<Result<RunRulesResponse>> RunAsync(RunRulesRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<RuleSuggestion?>> SuggestAsync(
        AccountId accountId,
        IReadOnlyList<RuleCandidate> candidates,
        CancellationToken cancellationToken);
}
