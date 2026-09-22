using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.UpdateSmtpSettings;

public sealed class UpdateSmtpSettingsEndpoint(ISettingsService settingsService)
    : Endpoint<UpdateSmtpSettingsRequest, SmtpSettingsResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Settings + "/smtp");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403));
    }

    public override async Task HandleAsync(UpdateSmtpSettingsRequest req, CancellationToken ct)
    {
        await Send.OkAsync((await settingsService.UpdateSmtpAsync(req, ct)).ValueOrThrow(), ct);
    }
}
