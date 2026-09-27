using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.Users.Shared;

public sealed record DiscordWebhookResponse(
    bool HasWebhook,
    bool IsEnabled,
    IReadOnlyList<NotificationType> Types,
    DateTimeOffset? LastDeliveredAt,
    string? LastError,
    bool DisabledByDiscord,
    bool Unreadable);
