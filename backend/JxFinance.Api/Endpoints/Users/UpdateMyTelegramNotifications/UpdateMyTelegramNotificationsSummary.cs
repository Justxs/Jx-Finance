using FastEndpoints;
using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.Users.UpdateMyTelegramNotifications;

public sealed class UpdateMyTelegramNotificationsSummary
    : Summary<UpdateMyTelegramNotificationsEndpoint, UpdateMyTelegramNotificationsRequest>
{
    public UpdateMyTelegramNotificationsSummary()
    {
        Summary = "Choose which notifications are posted to Telegram";
        Description = "Replaces the list of notification kinds of yours that are also posted to the installation's "
            + "Telegram group, with your name in front. Every in-app notification of a chosen kind then queues one "
            + "Telegram message, at most once per kind, subject and day. Nothing is posted while an administrator has "
            + "not switched Telegram on and saved a bot token and a group. The group is shared: everyone in it sees "
            + "what you tick. An empty list is allowed and posts nothing.";
        ExampleRequest = new UpdateMyTelegramNotificationsRequest(
            [NotificationType.BillDue, NotificationType.BudgetExceeded]);
        Responses[200] = "Your profile with the saved list of Telegram notification kinds.";
        Responses[400] = "Validation failed.";
        Responses[429] = "Too many changes from this client; wait and retry.";
    }
}
