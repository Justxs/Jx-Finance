using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.UpdateTelegramSettings;

public sealed class UpdateTelegramSettingsEndpoint(ITelegramSettingsService telegramSettings)
    : Endpoint<UpdateTelegramSettingsRequest, TelegramSettingsResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Settings + "/telegram");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
        Throttle(hitLimit: 20, durationSeconds: 300);
        Description(d => d.Produces(429).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(UpdateTelegramSettingsRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await telegramSettings.UpdateTelegramAsync(req, ct), ct);
}
