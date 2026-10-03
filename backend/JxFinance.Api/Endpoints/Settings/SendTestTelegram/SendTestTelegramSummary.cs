using FastEndpoints;

namespace JxFinance.Endpoints.Settings.SendTestTelegram;

public sealed class SendTestTelegramSummary : Summary<SendTestTelegramEndpoint>
{
    public SendTestTelegramSummary()
    {
        Summary = "Send a test message to the Telegram group";
        Description = "Posts one short message to the saved group right away and waits for Telegram's answer, even "
            + "while Telegram is switched off, so the group can be checked before members use it. Nothing is queued, "
            + "so a failure is not retried. When Telegram says the group became a supergroup with a new id, the new id "
            + "is saved and the message sent again. A refusal answers 400 with Telegram's own words: "
            + "telegram.botRemoved when the bot was removed from the group or its token revoked (which also marks it), "
            + "telegram.rateLimited, telegram.rejected or telegram.sendFailed. telegram.tokenUnreadable means the "
            + "stored token cannot be decrypted any more. Rate limited to 10 calls per five minutes per client. "
            + "Administrators only.";
        Responses[204] = "Telegram accepted the message.";
        Responses[400] = "Telegram refused the message, or the stored token cannot be read.";
        Responses[403] = "Only administrators can test the Telegram group.";
        Responses[404] = "No bot token or no chat id is saved.";
        Responses[429] = "Too many test messages from this client; wait and retry.";
    }
}
