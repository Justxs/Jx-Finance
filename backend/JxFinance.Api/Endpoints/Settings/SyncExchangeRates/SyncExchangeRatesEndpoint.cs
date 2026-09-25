using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.SyncExchangeRates;

public sealed class SyncExchangeRatesEndpoint(ISettingsService settingsService)
    : EndpointWithoutRequest<ExchangeRateSyncResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Settings + "/exchange-rates/sync");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await settingsService.SyncExchangeRatesAsync(ct), ct);
}
