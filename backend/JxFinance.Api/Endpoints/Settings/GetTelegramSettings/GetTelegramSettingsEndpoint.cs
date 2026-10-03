using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.GetTelegramSettings;

public sealed class GetTelegramSettingsEndpoint(ITelegramSettingsService telegramSettings)
    : EndpointWithoutRequest<TelegramSettingsResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Settings + "/telegram");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await telegramSettings.GetTelegramAsync(ct), ct);
}
