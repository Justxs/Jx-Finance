using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.Users.UpdateMyTelegramNotifications;

public sealed record UpdateMyTelegramNotificationsRequest(IReadOnlyList<NotificationType> Types);
