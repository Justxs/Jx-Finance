using FastEndpoints;
using JxFinance.Endpoints.Notifications.Interfaces;
using JxFinance.Endpoints.Notifications.Shared;

namespace JxFinance.Endpoints.Notifications.GetNotifications;

public sealed class GetNotificationsEndpoint(INotificationService notificationService)
    : Endpoint<GetNotificationsRequest, IReadOnlyList<NotificationResponse>>
{
    public override void Configure()
    {
        Get("notifications");
        Group<NotificationsGroup>();
    }

    public override async Task HandleAsync(GetNotificationsRequest req, CancellationToken ct)
    {
        var notifications = await notificationService.GetAllAsync(req.Unread, ct);
        await Send.OkAsync(notifications, ct);
    }
}
