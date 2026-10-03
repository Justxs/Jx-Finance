using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class GetSetupReadinessEndpoint(ISettingsService settingsService) : EndpointWithoutRequest<SetupReadinessResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Setup + "/readiness");
        Group<SetupGroup>();
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(settingsService.GetReadiness(), ct);
}
