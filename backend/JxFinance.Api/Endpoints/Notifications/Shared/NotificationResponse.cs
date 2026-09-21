using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.Notifications.Shared;

public sealed record NotificationResponse(
    Guid Id,
    NotificationType Type,
    string Title,
    string Message,
    NotificationPayload Payload,
    string? RelatedType,
    Guid? RelatedId,
    NotificationChannel Channel,
    bool IsRead,
    DateTimeOffset CreatedAt);
