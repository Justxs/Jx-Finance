namespace JxFinance.Endpoints.Settings.Shared;

public sealed record TelegramSettingsResponse(
    bool Enabled,
    bool HasToken,
    long? ChatId,
    DateTimeOffset? LastDeliveredAt,
    string? LastError,
    bool DisabledByTelegram,
    bool Unreadable);
