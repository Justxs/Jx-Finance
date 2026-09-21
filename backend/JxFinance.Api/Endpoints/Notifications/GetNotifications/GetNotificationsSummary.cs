using FastEndpoints;

namespace JxFinance.Endpoints.Notifications.GetNotifications;

public sealed class GetNotificationsSummary : Summary<GetNotificationsEndpoint, GetNotificationsRequest>
{
    public GetNotificationsSummary()
    {
        Summary = "List notifications";
        Description = "Returns your notifications, newest first. Background jobs raise them: a recurring bill "
            + "about to fall due, or a budget that has reached 80% or 100% of its effective limit in the current "
            + "window. Each row carries a typed payload the client turns into localized text, and rows stay "
            + "listed even when the feature that produced them is switched off afterwards.";
        RequestParam(r => r.Unread, "Set to true for unread only, false for read only. Omit for both.");
        Responses[200] = "The notifications for the signed-in user.";
    }
}
