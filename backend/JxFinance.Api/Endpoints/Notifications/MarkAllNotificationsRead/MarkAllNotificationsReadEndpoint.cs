using FastEndpoints;
using JxFinance.Endpoints.Notifications.Interfaces;

namespace JxFinance.Endpoints.Notifications.MarkAllNotificationsRead;

public sealed class MarkAllNotificationsReadEndpoint(INotificationService notificationService)
    : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post("notifications/read-all");
        Group<NotificationsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await notificationService.MarkAllReadAsync(ct);
        await Send.NoContentAsync(ct);
    }
}
