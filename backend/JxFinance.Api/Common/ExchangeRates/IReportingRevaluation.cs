using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Transactions;

namespace JxFinance.Common.ExchangeRates;

public interface IReportingRevaluation
{
    Task LockAsync(CancellationToken cancellationToken);

    Task<string?> RevalueAsync(
        IQueryable<Transaction> transactions,
        IQueryable<InvestmentTransaction> entries,
        Currency reportingCurrency,
        CancellationToken cancellationToken);

    Task<string?> ConvertPlansAsync(Currency from, Currency to, CancellationToken cancellationToken);
}
