using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.SendTestEmail;

public sealed class SendTestEmailEndpoint(ISettingsService settingsService)
    : EndpointWithoutRequest<SmtpTestResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Settings + "/smtp/test");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.Produces(429).ProducesProblemDetails(403));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkOrProblemAsync(await settingsService.SendTestEmailAsync(ct), ct);
}
