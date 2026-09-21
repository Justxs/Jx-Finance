using JxFinance.Domain.Common;

namespace JxFinance.Domain.Notifications;

public sealed class Notification : OwnableEntity
{
    public NotificationId Id { get; set; } = NotificationId.New();
    public NotificationType Type { get; set; }
    public required string Title { get; set; }
    public required string Message { get; set; }
    public NotificationPayload? Payload { get; set; }
    public string? RelatedType { get; set; }
    public Guid? RelatedId { get; set; }
    public NotificationChannel Channel { get; set; } = NotificationChannel.InApp;
    public bool IsRead { get; set; }
}
