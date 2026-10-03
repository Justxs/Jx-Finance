using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.UpdateDiscordSettings;

public sealed class UpdateDiscordSettingsEndpoint(IDiscordSettingsService discordSettings)
    : Endpoint<UpdateDiscordSettingsRequest, DiscordSettingsResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Settings + "/discord");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
        Throttle(hitLimit: 20, durationSeconds: 300);
        Description(d => d.Produces(429));
    }

    public override async Task HandleAsync(UpdateDiscordSettingsRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await discordSettings.UpdateDiscordAsync(req, ct), ct);
}
