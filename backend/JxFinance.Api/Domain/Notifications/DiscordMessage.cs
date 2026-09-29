using JxFinance.Domain.Common;

namespace JxFinance.Domain.Notifications;

public sealed class DiscordMessage : OutboxMessage
{
    public const int ContentMaxLength = 2000;

    public Guid UserId { get; set; }
    public NotificationType NotificationType { get; set; }
    public string Content { get; set; } = string.Empty;
}
