using JxFinance.Domain.Accounts;

namespace JxFinance.Endpoints.Investments.Interfaces;

public interface IHoldingsValuation
{
    Task<IReadOnlyDictionary<AccountId, (decimal Value, bool IsComplete)>> ValueAsync(
        IReadOnlyCollection<AccountId> accountIds,
        CancellationToken cancellationToken);
}
