using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Common.ExchangeRates;

public interface ITransactionValuation
{
    Task<Result<TransactionValue>> ValueAsync(
        AccountId accountId,
        decimal amount,
        Currency? currency,
        DateOnly date,
        IReadOnlyCollection<Currency> currenciesInUse,
        CancellationToken cancellationToken);
}
