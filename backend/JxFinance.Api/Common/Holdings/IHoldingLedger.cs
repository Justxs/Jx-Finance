using JxFinance.Domain.Accounts;
using JxFinance.Domain.Investments;

namespace JxFinance.Common.Holdings;

public interface IHoldingLedger
{
    Task<InvestmentTransactionId?> FirstOversoldSaleAsync(
        AccountId accountId,
        SecurityId securityId,
        Func<IEnumerable<InvestmentTransaction>, IEnumerable<InvestmentTransaction>> change,
        CancellationToken cancellationToken);
}
