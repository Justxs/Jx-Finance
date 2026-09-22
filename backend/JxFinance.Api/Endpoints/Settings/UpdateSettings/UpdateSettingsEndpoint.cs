using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.UpdateSettings;

public sealed class UpdateSettingsEndpoint(ISettingsService settingsService)
    : Endpoint<UpdateSettingsRequest, SettingsResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Settings);
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403));
    }

    public override async Task HandleAsync(UpdateSettingsRequest req, CancellationToken ct)
    {
        await Send.OkOrProblemAsync(await settingsService.UpdateAsync(req, ct), ct);
    }
}
