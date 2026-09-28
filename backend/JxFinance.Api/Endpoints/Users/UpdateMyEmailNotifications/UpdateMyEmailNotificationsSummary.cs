using FastEndpoints;
using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.Users.UpdateMyEmailNotifications;

public sealed class UpdateMyEmailNotificationsSummary
    : Summary<UpdateMyEmailNotificationsEndpoint, UpdateMyEmailNotificationsRequest>
{
    public UpdateMyEmailNotificationsSummary()
    {
        Summary = "Choose which notifications you are emailed";
        Description = "Replaces the list of notification kinds that are also sent to your email address. Every in-app "
            + "notification of a chosen kind then queues one email, at most once per kind, subject and day. Nothing "
            + "is sent while the installation has no working mail server or while your address is not confirmed. "
            + "An empty list is allowed and sends no notification email; account mail such as password reset links "
            + "does not depend on it.";
        ExampleRequest = new UpdateMyEmailNotificationsRequest(
            [NotificationType.BillDue, NotificationType.BudgetExceeded]);
        Responses[200] = "Your profile with the saved list of emailed notification kinds.";
        Responses[400] = "Validation failed.";
        Responses[429] = "Too many changes from this client; wait and retry.";
    }
}
