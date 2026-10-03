using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateMarketPriceSettings;

namespace JxFinance.Endpoints.Settings.Interfaces;

public interface IMarketPriceSettingsService
{
    Task<MarketPriceSettingsResponse> GetMarketPricesAsync(CancellationToken cancellationToken);

    Task<MarketPriceSettingsResponse> UpdateMarketPricesAsync(
        UpdateMarketPriceSettingsRequest request,
        CancellationToken cancellationToken);
}
