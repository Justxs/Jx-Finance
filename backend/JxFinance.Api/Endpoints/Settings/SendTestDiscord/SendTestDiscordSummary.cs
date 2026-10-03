using FastEndpoints;

namespace JxFinance.Endpoints.Settings.SendTestDiscord;

public sealed class SendTestDiscordSummary : Summary<SendTestDiscordEndpoint>
{
    public SendTestDiscordSummary()
    {
        Summary = "Send a test message to the Discord channel";
        Description = "Posts one short message to the saved webhook right away and waits for Discord's answer, even "
            + "while Discord is switched off, so the channel can be checked before members use it. Nothing is queued, "
            + "so a failure is not retried. A refusal answers 400 with Discord's own words: discord.webhookGone when "
            + "Discord no longer knows the webhook (which also marks it), discord.rateLimited, discord.rejected or "
            + "discord.sendFailed. discord.webhookUnreadable means the stored URL cannot be decrypted any more. Rate "
            + "limited to 10 calls per five minutes per client. Administrators only.";
        Responses[204] = "Discord accepted the message.";
        Responses[400] = "Discord refused the message, or the stored webhook cannot be read.";
        Responses[403] = "Only administrators can test the Discord channel.";
        Responses[404] = "No webhook is saved.";
        Responses[429] = "Too many test messages from this client; wait and retry.";
    }
}
