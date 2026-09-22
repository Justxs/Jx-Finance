using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Notifications.Interfaces;

namespace JxFinance.Endpoints.Notifications.MarkAllNotificationsRead;

public sealed class MarkAllNotificationsReadEndpoint(INotificationService notificationService)
    : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post(ApiRoutes.Notifications + "/read-all");
        Group<NotificationsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await notificationService.MarkAllReadAsync(ct);
        await Send.NoContentAsync(ct);
    }
}
