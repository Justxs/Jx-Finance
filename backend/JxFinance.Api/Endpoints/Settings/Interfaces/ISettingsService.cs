using JxFinance.Domain.Common;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateSettings;

namespace JxFinance.Endpoints.Settings.Interfaces;

public interface ISettingsService
{
    Task<SettingsResponse> GetAsync(CancellationToken cancellationToken);

    PublicSettingsResponse GetPublic();

    Task<Result<SettingsResponse>> UpdateAsync(UpdateSettingsRequest request, CancellationToken cancellationToken);

    Task<ExchangeRateSyncResponse> SyncExchangeRatesAsync(CancellationToken cancellationToken);
}
