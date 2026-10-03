using JxFinance.Domain.Common;

namespace JxFinance.Domain.Notifications;

public sealed class TelegramMessage : OutboxMessage, IChatMessage
{
    public const int ContentMaxLength = 4096;

    public Guid UserId { get; set; }
    public NotificationType NotificationType { get; set; }
    public string Content { get; set; } = string.Empty;
}
