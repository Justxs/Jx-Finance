using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Notifications.Interfaces;
using JxFinance.Endpoints.Notifications.Shared;

namespace JxFinance.Endpoints.Notifications.GetNotifications;

public sealed class GetNotificationsEndpoint(INotificationService notificationService)
    : Endpoint<GetNotificationsRequest, IReadOnlyList<NotificationResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Notifications);
        Group<NotificationsGroup>();
    }

    public override async Task HandleAsync(GetNotificationsRequest req, CancellationToken ct) =>
        await Send.OkAsync(await notificationService.GetAllAsync(req.Unread, ct), ct);
}
