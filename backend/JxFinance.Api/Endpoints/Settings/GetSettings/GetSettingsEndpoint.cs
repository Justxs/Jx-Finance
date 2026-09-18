using FastEndpoints;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;

namespace JxFinance.Endpoints.Settings.GetSettings;

public sealed class GetSettingsEndpoint(ISettingsService settingsService) : EndpointWithoutRequest<SettingsResponse>
{
    public override void Configure()
    {
        Get("settings");
        Group<SettingsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await settingsService.GetAsync(ct), ct);
    }
}
