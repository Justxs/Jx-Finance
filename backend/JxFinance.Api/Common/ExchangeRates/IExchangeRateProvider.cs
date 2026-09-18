using JxFinance.Domain.ExchangeRates;

namespace JxFinance.Common.ExchangeRates;

public interface IExchangeRateProvider
{
    Task<IReadOnlyList<ExchangeRate>> GetAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken);
}
