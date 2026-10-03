using FastEndpoints;
using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.Users.UpdateMyDiscordNotifications;

public sealed class UpdateMyDiscordNotificationsSummary
    : Summary<UpdateMyDiscordNotificationsEndpoint, UpdateMyDiscordNotificationsRequest>
{
    public UpdateMyDiscordNotificationsSummary()
    {
        Summary = "Choose which notifications are posted to Discord";
        Description = "Replaces the list of notification kinds of yours that are also posted to the installation's "
            + "Discord channel, with your name in front. Every in-app notification of a chosen kind then queues one "
            + "Discord message, at most once per kind, subject and day. Nothing is posted while an administrator has "
            + "not switched Discord on and saved a webhook. The channel is shared: everyone who can read it sees what "
            + "you tick. An empty list is allowed and posts nothing.";
        ExampleRequest = new UpdateMyDiscordNotificationsRequest(
            [NotificationType.BillDue, NotificationType.BudgetExceeded]);
        Responses[200] = "Your profile with the saved list of Discord notification kinds.";
        Responses[400] = "Validation failed.";
        Responses[429] = "Too many changes from this client; wait and retry.";
    }
}
