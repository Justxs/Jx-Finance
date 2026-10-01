using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Common.LearnedCategories;

public sealed record LearnedCandidate(AccountId AccountId, FlowType Type, decimal Amount, string? Description);

public interface ILearnedCategoryService
{
    Task<IReadOnlyList<LearnedGuess?>> SuggestAsync(
        IReadOnlyList<LearnedCandidate> candidates,
        CancellationToken cancellationToken);
}
