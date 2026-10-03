using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.GetDiscordSettings;

public sealed class GetDiscordSettingsEndpoint(IDiscordSettingsService discordSettings)
    : EndpointWithoutRequest<DiscordSettingsResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Settings + "/discord");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await discordSettings.GetDiscordAsync(ct), ct);
}
