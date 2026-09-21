using JxFinance.Domain.Common;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateSettings;
using JxFinance.Endpoints.Settings.UpdateSmtpSettings;

namespace JxFinance.Endpoints.Settings.Interfaces;

public interface ISettingsService
{
    Task<SettingsResponse> GetAsync(CancellationToken cancellationToken);

    PublicSettingsResponse GetPublic();

    SmtpSettingsResponse GetSmtp();

    Task<Result<SmtpSettingsResponse>> UpdateSmtpAsync(
        UpdateSmtpSettingsRequest request,
        CancellationToken cancellationToken);

    Task<Result<SmtpTestResponse>> SendTestEmailAsync(CancellationToken cancellationToken);

    Task<Result<SettingsResponse>> UpdateAsync(UpdateSettingsRequest request, CancellationToken cancellationToken);

    Task<ExchangeRateSyncResponse> SyncExchangeRatesAsync(CancellationToken cancellationToken);
}
