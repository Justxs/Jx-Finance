using FastEndpoints;

namespace JxFinance.Endpoints.Notifications.MarkNotificationRead;

public sealed class MarkNotificationReadSummary : Summary<MarkNotificationReadEndpoint>
{
    public MarkNotificationReadSummary()
    {
        Summary = "Mark one notification read";
        Description = "Marks a single notification as read. Marking an already read notification again "
            + "changes nothing and still answers 204.";
        Params["id"] = "The notification id.";
        Responses[204] = "The notification is marked read.";
        Responses[404] = "No such notification belongs to the signed-in user.";
    }
}
