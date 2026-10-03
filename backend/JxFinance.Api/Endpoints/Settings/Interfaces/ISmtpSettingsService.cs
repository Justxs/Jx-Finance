using JxFinance.Domain.Common;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateSmtpSettings;

namespace JxFinance.Endpoints.Settings.Interfaces;

public interface ISmtpSettingsService
{
    SmtpSettingsResponse GetSmtp();

    Task<Result<SmtpSettingsResponse>> UpdateSmtpAsync(
        UpdateSmtpSettingsRequest request,
        CancellationToken cancellationToken);

    Task<Result<SmtpTestResponse>> SendTestEmailAsync(CancellationToken cancellationToken);
}
