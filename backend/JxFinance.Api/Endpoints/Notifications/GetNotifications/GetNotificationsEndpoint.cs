using FastEndpoints;

namespace JxFinance.Endpoints.Notifications.GetNotifications;

public sealed class GetNotificationsEndpoint(INotificationService notificationService)
    : Endpoint<GetNotificationsRequest, IReadOnlyList<NotificationResponse>>
{
    public override void Configure()
    {
        Get("/api/notifications");
    }

    public override async Task HandleAsync(GetNotificationsRequest req, CancellationToken ct)
    {
        var notifications = await notificationService.GetAllAsync(req.Unread, ct);
        await Send.OkAsync(notifications, ct);
    }
}
