using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;

namespace JxFinance.Endpoints.Settings.GetPublicSettings;

public sealed class GetPublicSettingsEndpoint(ISettingsService settingsService)
    : EndpointWithoutRequest<PublicSettingsResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Settings + "/public");
        Group<SettingsGroup>();
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(settingsService.GetPublic(), ct);
}
