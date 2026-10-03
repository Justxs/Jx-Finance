using JxFinance.Domain.Common;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateMarketPriceSettings;

namespace JxFinance.Endpoints.Settings.Interfaces;

public interface IMarketPriceSettingsService
{
    Task<MarketPriceSettingsResponse> GetMarketPricesAsync(CancellationToken cancellationToken);

    Task<Result<MarketPriceSettingsResponse>> UpdateMarketPricesAsync(
        UpdateMarketPriceSettingsRequest request,
        CancellationToken cancellationToken);
}
