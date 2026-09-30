using JxFinance.Domain.Common;

namespace JxFinance.Domain.Notifications;

public sealed class Notification : OwnableEntity
{
    public const int ReadRetentionDays = 180;

    public NotificationId Id { get; set; } = NotificationId.New();
    public NotificationType Type { get; set; }
    public required string Title { get; set; }
    public string Message { get; set; } = string.Empty;
    public NotificationPayload? Payload { get; set; }
    public string? RelatedType { get; set; }
    public Guid? RelatedId { get; set; }
    public NotificationChannel Channel { get; set; } = NotificationChannel.InApp;
    public bool IsRead { get; set; }
}
