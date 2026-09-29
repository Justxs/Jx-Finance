using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.TestReceiptKey;

public sealed class TestReceiptKeyEndpoint(ISettingsService settingsService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post(ApiRoutes.Settings + "/receipts/test");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.Produces(204).Produces(429).ProducesProblemDetails(403).ProducesProblemDetails(502));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await settingsService.TestReceiptKeyAsync(ct), ct);
}
