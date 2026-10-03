using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class FinishSetupEndpoint(ISettingsService settingsService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post(ApiRoutes.Setup + "/finish");
        Group<SetupGroup>();
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await settingsService.MarkSetupPendingAsync(false, ct);
        await Send.NoContentAsync(ct);
    }
}
