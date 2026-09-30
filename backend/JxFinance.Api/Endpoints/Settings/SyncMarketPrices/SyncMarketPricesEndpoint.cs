using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.SyncMarketPrices;

public sealed class SyncMarketPricesEndpoint(IPriceSyncService priceSync)
    : EndpointWithoutRequest<MarketPriceSyncResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Settings + "/market-prices/sync");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkOrProblemAsync(await priceSync.SyncAsync(force: true, ct), ct);
}
