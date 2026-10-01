using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.SetExchangeRate;

public sealed class SetExchangeRateEndpoint(IExchangeRateEntryService entryService)
    : Endpoint<SetExchangeRateRequest, ExchangeRateEntryResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Settings + "/exchange-rates/{currency}/{date}");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(SetExchangeRateRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await entryService.SetAsync(req, ct), ct);
}
