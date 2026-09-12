using FastEndpoints;

namespace JxFinance.Endpoints.Notifications.GetNotifications;

public sealed class GetNotificationsSummary : Summary<GetNotificationsEndpoint, GetNotificationsRequest>
{
    public GetNotificationsSummary()
    {
        Summary = "List notifications";
        Description = "Returns your notifications, newest first. These are raised by background jobs, "
            + "for example when a recurring bill is about to fall due.";
        RequestParam(r => r.Unread, "Set to true for unread only, false for read only. Omit for both.");
        Responses[200] = "The notifications for the signed-in user.";
    }
}
