using System.Globalization;
using JxFinance.Common.Formats;
using JxFinance.Domain.Notifications;
using JxFinance.Endpoints.Notifications.Shared;

namespace JxFinance.Endpoints.Notifications.Mappers;

public static class NotificationMapper
{
    private static readonly NotificationPayload Empty = new();

    public static NotificationResponse ToResponse(this Notification notification) => new(
        notification.Id.Value,
        notification.Type,
        notification.Title,
        notification.Message,
        notification.Payload ?? Restore(notification),
        notification.RelatedType,
        notification.RelatedId,
        notification.Channel,
        notification.IsRead,
        notification.CreatedAt);

    private static NotificationPayload Restore(Notification notification) =>
        notification.Type == NotificationType.BillDue
            && DateOnly.TryParseExact(
                notification.Message,
                DateFormats.IsoDate,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var dueDate)
            ? new NotificationPayload { DueDate = dueDate }
            : Empty;
}
