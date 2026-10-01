using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.GetExchangeRateEntries;

public sealed class GetExchangeRateEntriesEndpoint(IExchangeRateEntryService entryService)
    : Endpoint<GetExchangeRateEntriesRequest, IReadOnlyList<ExchangeRateEntryResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Settings + "/exchange-rates");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(GetExchangeRateEntriesRequest req, CancellationToken ct) =>
        await Send.OkAsync(await entryService.GetAsync(req, ct), ct);
}
