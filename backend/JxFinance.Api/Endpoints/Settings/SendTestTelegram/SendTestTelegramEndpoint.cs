using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.SendTestTelegram;

public sealed class SendTestTelegramEndpoint(ITelegramSettingsService telegramSettings) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post(ApiRoutes.Settings + "/telegram/test");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.Produces(204).Produces(429).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await telegramSettings.SendTestTelegramAsync(ct), ct);
}
