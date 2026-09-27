using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.UpdateDiscordSettings;

public sealed class UpdateDiscordSettingsEndpoint(ISettingsService settingsService)
    : Endpoint<UpdateDiscordSettingsRequest>
{
    public override void Configure()
    {
        Put(ApiRoutes.Settings + "/discord");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403));
    }

    public override async Task HandleAsync(UpdateDiscordSettingsRequest req, CancellationToken ct)
    {
        await settingsService.UpdateDiscordAsync(req, ct);
        await Send.NoContentAsync(ct);
    }
}
