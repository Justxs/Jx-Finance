using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.Notifications;

public sealed record NotificationResponse(
    Guid Id,
    NotificationType Type,
    string Title,
    string Message,
    string? RelatedType,
    Guid? RelatedId,
    NotificationChannel Channel,
    bool IsRead,
    DateTimeOffset CreatedAt);
