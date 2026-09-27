using JxFinance.Domain.Common;

namespace JxFinance.Domain.Notifications;

public sealed class DiscordWebhook : OwnableEntity
{
    public const int ProtectedUrlMaxLength = 1000;
    public const int ErrorMaxLength = 500;

    public DiscordWebhookId Id { get; set; } = DiscordWebhookId.New();
    public string ProtectedUrl { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public List<NotificationType> Types { get; set; } = [];
    public DateTimeOffset? LastDeliveredAt { get; set; }
    public string? LastError { get; set; }
    public DateTimeOffset? DisabledByDiscordAt { get; set; }

    public void RecordSend(DateTimeOffset now, string? error, bool gone = false)
    {
        LastError = error;
        if (error is null)
        {
            LastDeliveredAt = now;
            DisabledByDiscordAt = null;
        }
        else if (gone)
        {
            DisabledByDiscordAt = now;
        }
    }
}
