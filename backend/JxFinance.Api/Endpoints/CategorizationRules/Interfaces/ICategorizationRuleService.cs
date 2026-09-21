using JxFinance.Domain.Accounts;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.Interfaces;

public interface ICategorizationRuleService
{
    Task<IReadOnlyList<CategorizationRuleWithTags>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<CategorizationRuleWithTags>> CreateAsync(
        CategorizationRule rule,
        IReadOnlyList<Guid> tagIds,
        CancellationToken cancellationToken);

    Task<Result<CategorizationRuleWithTags>> UpdateAsync(
        Guid id,
        Action<CategorizationRule> apply,
        IReadOnlyList<Guid> tagIds,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<CategorizationRuleWithTags>>> MoveAsync(
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
