using FastEndpoints;

namespace JxFinance.Endpoints.Notifications.MarkAllNotificationsRead;

public sealed class MarkAllNotificationsReadEndpoint(INotificationService notificationService)
    : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post("/api/notifications/read-all");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await notificationService.MarkAllReadAsync(ct);
        await Send.NoContentAsync(ct);
    }
}
