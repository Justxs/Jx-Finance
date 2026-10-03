using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.GetSmtpSettings;

public sealed class GetSmtpSettingsEndpoint(ISmtpSettingsService smtpSettings)
    : EndpointWithoutRequest<SmtpSettingsResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Settings + "/smtp");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(smtpSettings.GetSmtp(), ct);
}
