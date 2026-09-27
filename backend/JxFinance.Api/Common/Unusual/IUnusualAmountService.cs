using JxFinance.Domain.Transactions;

namespace JxFinance.Common.Unusual;

public interface IUnusualAmountService
{
    Task<IReadOnlyList<UnusualVerdict?>> EvaluateAsync(
        IReadOnlyList<UnusualCandidate> candidates,
        CancellationToken cancellationToken);
}
