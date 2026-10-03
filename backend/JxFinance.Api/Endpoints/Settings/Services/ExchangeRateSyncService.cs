using FastEndpoints;
using JxFinance.Common.ExchangeRates;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;

namespace JxFinance.Endpoints.Settings.Services;

[RegisterService<IExchangeRateSyncService>(LifeTime.Scoped)]
public sealed class ExchangeRateSyncService(IExchangeRateService rates) : IExchangeRateSyncService
{
    public async Task<ExchangeRateSyncResponse> SyncExchangeRatesAsync(CancellationToken cancellationToken)
    {
        var added = await rates.SyncAsync(force: true, cancellationToken);
        var latest = await rates.GetLatestAsync(cancellationToken);
        return new ExchangeRateSyncResponse(added, latest.AsOf);
    }
}
