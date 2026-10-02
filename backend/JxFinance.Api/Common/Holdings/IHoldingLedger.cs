using JxFinance.Domain.Accounts;
using JxFinance.Domain.Investments;

namespace JxFinance.Common.Holdings;

public interface IHoldingLedger
{
    Task<IReadOnlyCollection<InvestmentTransactionId>> NewlyOversoldAsync(
        AccountId accountId,
        Func<IEnumerable<InvestmentTransaction>, IEnumerable<InvestmentTransaction>> change,
        CancellationToken cancellationToken);
}
