using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.GetMarketPriceSettings;

public sealed class GetMarketPriceSettingsEndpoint(IMarketPriceSettingsService marketPriceSettings)
    : EndpointWithoutRequest<MarketPriceSettingsResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Settings + "/market-prices");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await marketPriceSettings.GetMarketPricesAsync(ct), ct);
}
