using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.Users.UpdateMyEmailNotifications;

public sealed record UpdateMyEmailNotificationsRequest(IReadOnlyList<NotificationType> Types);
