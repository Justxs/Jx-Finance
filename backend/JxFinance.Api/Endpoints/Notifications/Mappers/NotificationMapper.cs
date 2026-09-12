using FastEndpoints;
using JxFinance.Domain.Notifications;
using JxFinance.Endpoints.Notifications.Shared;

namespace JxFinance.Endpoints.Notifications.Mappers;

public sealed class NotificationMapper : Mapper<EmptyRequest, NotificationResponse, Notification>
{
    public override NotificationResponse FromEntity(Notification notification) => new(
        notification.Id.Value,
        notification.Type,
        notification.Title,
        notification.Message,
        notification.RelatedType,
        notification.RelatedId,
        notification.Channel,
        notification.IsRead,
        notification.CreatedAt);
}
