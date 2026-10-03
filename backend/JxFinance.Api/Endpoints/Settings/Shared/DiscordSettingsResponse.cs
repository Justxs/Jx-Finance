namespace JxFinance.Endpoints.Settings.Shared;

public sealed record DiscordSettingsResponse(
    bool Enabled,
    bool HasWebhook,
    DateTimeOffset? LastDeliveredAt,
    string? LastError,
    bool DisabledByDiscord,
    bool Unreadable);
