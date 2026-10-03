using JxFinance.Domain.Common;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateDiscordSettings;

namespace JxFinance.Endpoints.Settings.Interfaces;

public interface IDiscordSettingsService
{
    Task<DiscordSettingsResponse> GetDiscordAsync(CancellationToken cancellationToken);

    Task<Result<DiscordSettingsResponse>> UpdateDiscordAsync(
        UpdateDiscordSettingsRequest request,
        CancellationToken cancellationToken);

    Task<Result> SendTestDiscordAsync(CancellationToken cancellationToken);
}
