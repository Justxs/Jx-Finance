using JxFinance.Domain.Common;
using JxFinance.Endpoints.CategorizationRules.DismissSuggestedRule;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.Interfaces;

public interface ISuggestedRuleService
{
    Task<IReadOnlyList<SuggestedRuleResponse>> GetAsync(Guid? transactionId, CancellationToken cancellationToken);

    Task<Result<Guid>> DismissAsync(DismissSuggestedRuleRequest request, CancellationToken cancellationToken);
}
