using JxFinance.Endpoints.Settings.Shared;

namespace JxFinance.Endpoints.Settings.Interfaces;

public interface IExchangeRateSyncService
{
    Task<ExchangeRateSyncResponse> SyncExchangeRatesAsync(CancellationToken cancellationToken);
}
