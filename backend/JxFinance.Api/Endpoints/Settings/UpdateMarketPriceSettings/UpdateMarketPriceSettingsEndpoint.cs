using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.UpdateMarketPriceSettings;

public sealed class UpdateMarketPriceSettingsEndpoint(ISettingsService settingsService)
    : Endpoint<UpdateMarketPriceSettingsRequest, MarketPriceSettingsResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Settings + "/market-prices");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(UpdateMarketPriceSettingsRequest req, CancellationToken ct) =>
        await Send.OkAsync(await settingsService.UpdateMarketPricesAsync(req, ct), ct);
}
