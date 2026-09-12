using FastEndpoints;

namespace JxFinance.Endpoints.Notifications.MarkAllNotificationsRead;

public sealed class MarkAllNotificationsReadSummary : Summary<MarkAllNotificationsReadEndpoint>
{
    public MarkAllNotificationsReadSummary()
    {
        Summary = "Mark every notification read";
        Description = "Clears the unread badge by marking all of your notifications read at once.";
        Responses[204] = "Every notification is marked read.";
    }
}
