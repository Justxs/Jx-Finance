using FastEndpoints;

namespace JxFinance.Endpoints.Settings.UpdateDiscordSettings;

public sealed class UpdateDiscordSettingsSummary : Summary<UpdateDiscordSettingsEndpoint, UpdateDiscordSettingsRequest>
{
    public UpdateDiscordSettingsSummary()
    {
        Summary = "Save the installation's Discord channel";
        Description = "Stores the webhook of the one Discord channel this installation posts to and switches outbound "
            + "Discord traffic on or off for everyone. Members then choose on their profile which of their "
            + "notifications are posted there, with their name in front. Only webhook URLs on discord.com, "
            + "discordapp.com, ptb.discord.com or canary.discord.com of the form "
            + "https://discord.com/api/webhooks/{id}/{token} are accepted; anything else answers 400 "
            + "discord.invalidWebhook, as does switching Discord on before a webhook is saved. The URL is encrypted "
            + "before it is stored and never returned. Leaving webhookUrl empty keeps the stored one; a new URL also "
            + "clears the mark Discord left on a webhook it no longer knows. While Discord is off nothing is queued "
            + "or sent; messages that were already queued are not sent late but pruned after seven days. "
            + "Administrators only.";
        ExampleRequest = new UpdateDiscordSettingsRequest(
            true,
            "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz");
        RequestParam(r => r.WebhookUrl, "Leave empty to keep the stored webhook.");
        Responses[200] = "The saved Discord settings, without the webhook URL.";
        Responses[400] = "Validation failed, or discord.invalidWebhook.";
        Responses[403] = "Only administrators can change installation settings.";
        Responses[429] = "Too many changes from this client; wait and retry.";
    }
}
