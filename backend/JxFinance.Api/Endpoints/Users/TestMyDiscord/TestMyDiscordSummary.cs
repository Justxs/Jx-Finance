using FastEndpoints;

namespace JxFinance.Endpoints.Users.TestMyDiscord;

public sealed class TestMyDiscordSummary : Summary<TestMyDiscordEndpoint>
{
    public TestMyDiscordSummary()
    {
        Summary = "Send a test message to your Discord channel";
        Description = "Posts one short message to your saved webhook right away and waits for Discord's answer. "
            + "Nothing is queued, so a failure is not retried. A refusal answers 400 with Discord's own words: "
            + "discord.webhookGone when Discord no longer knows the webhook (which also marks it on your profile), "
            + "discord.rateLimited, discord.rejected or discord.sendFailed. discord.disabled means an administrator has "
            + "not allowed Discord on this installation, and discord.webhookUnreadable that the stored URL cannot be "
            + "decrypted any more. Save the webhook before testing it. Rate limited to 10 calls per five minutes per "
            + "client.";
        Responses[204] = "Discord accepted the message.";
        Responses[400] = "Discord refused the message, or Discord is switched off for this installation.";
        Responses[404] = "No webhook is saved on your profile.";
        Responses[429] = "Too many test messages from this client; wait and retry.";
    }
}
