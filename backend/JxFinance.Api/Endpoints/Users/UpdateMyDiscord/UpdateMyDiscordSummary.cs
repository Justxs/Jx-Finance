using FastEndpoints;
using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.Users.UpdateMyDiscord;

public sealed class UpdateMyDiscordSummary : Summary<UpdateMyDiscordEndpoint, UpdateMyDiscordRequest>
{
    public UpdateMyDiscordSummary()
    {
        Summary = "Save your Discord notification settings";
        Description = "Stores your personal Discord webhook, whether it is switched on and which notification kinds "
            + "it receives. Every in-app notification of a chosen kind is then also posted to that channel, as long as "
            + "an administrator allows Discord on this installation. Only webhook URLs on discord.com, discordapp.com, "
            + "ptb.discord.com or canary.discord.com of the form https://discord.com/api/webhooks/{id}/{token} are "
            + "accepted; anything else answers 400 discord.invalidWebhook. The URL is encrypted before it is stored and "
            + "never returned. Leaving webhookUrl empty keeps the stored one; a new URL also clears the mark Discord "
            + "left on a webhook it no longer knows. The first save needs a URL. An empty list of kinds is allowed and "
            + "sends nothing.";
        ExampleRequest = new UpdateMyDiscordRequest(
            "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz",
            true,
            [NotificationType.BillDue, NotificationType.BudgetExceeded]);
        RequestParam(r => r.WebhookUrl, "Leave empty to keep the stored webhook.");
        Responses[200] = "Your saved Discord settings, without the webhook URL.";
        Responses[400] = "Validation failed, or discord.invalidWebhook.";
        Responses[409] = "conflict.busy: the first webhook was saved from another window at the same moment. Try again.";
        Responses[429] = "Too many changes from this client; wait and retry.";
    }
}
