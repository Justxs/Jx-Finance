using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.UpdateSmtpSettings;

public sealed class UpdateSmtpSettingsEndpoint(ISmtpSettingsService smtpSettings)
    : Endpoint<UpdateSmtpSettingsRequest, SmtpSettingsResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Settings + "/smtp");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(UpdateSmtpSettingsRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await smtpSettings.UpdateSmtpAsync(req, ct), ct);
}
