using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.Users.UpdateMyDiscordNotifications;

public sealed record UpdateMyDiscordNotificationsRequest(IReadOnlyList<NotificationType> Types);
