using JxFinance.Domain.Common;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateTelegramSettings;

namespace JxFinance.Endpoints.Settings.Interfaces;

public interface ITelegramSettingsService
{
    Task<TelegramSettingsResponse> GetTelegramAsync(CancellationToken cancellationToken);

    Task<Result<TelegramSettingsResponse>> UpdateTelegramAsync(
        UpdateTelegramSettingsRequest request,
        CancellationToken cancellationToken);

    Task<Result> SendTestTelegramAsync(CancellationToken cancellationToken);
}
