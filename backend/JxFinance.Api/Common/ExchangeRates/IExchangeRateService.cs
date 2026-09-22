using JxFinance.Domain.Common;
using JxFinance.Domain.ExchangeRates;

namespace JxFinance.Common.ExchangeRates;

public interface IExchangeRateService
{
    Currency ReportingCurrency { get; }

    string? UnusableReason(params Currency[] currencies);

    Task<RateTable> GetLatestAsync(CancellationToken cancellationToken);

    Task<RateTable> GetForDateAsync(DateOnly date, CancellationToken cancellationToken);

    Task<RateHistory> GetHistoryAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken);

    Task<Result<decimal>> ToReportingAsync(Money amount, DateOnly date, CancellationToken cancellationToken);

    Task<Result<decimal>> ConvertAsync(Money amount, Currency to, DateOnly date, CancellationToken cancellationToken);

    Task<int> SyncAsync(bool force, CancellationToken cancellationToken);

    Task EnsureRangeAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken);

    Task PreloadAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken);
}
