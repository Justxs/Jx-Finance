using FastEndpoints;

namespace JxFinance.Endpoints.Settings.SendTestEmail;

public sealed class SendTestEmailSummary : Summary<SendTestEmailEndpoint>
{
    public SendTestEmailSummary()
    {
        Summary = "Send a test message";
        Description = "Sends one short message to the calling administrator's own address with the settings that are "
            + "stored right now, and waits for the mail server to accept it. Nothing is written: the message does not "
            + "go through the outbox and leaves no row behind, so a failed attempt is not retried. Success answers the "
            + "address the message went to; a refusal answers 400 with email.sendFailed and the mail server's own "
            + "words, email.notConfigured when the settings are incomplete or switched off, or "
            + "email.passwordUnreadable when the stored password cannot be decrypted, which is what a restore into an "
            + "installation with different data protection keys leaves behind. The attempt gives up after the "
            + "configured send timeout, so a dead server cannot hold the request open. Save the settings before "
            + "testing them. Rate limited to 10 calls per five minutes per client.";
        Responses[200] = "The mail server accepted the message.";
        Responses[400] = "The mail server refused the message, or the settings are incomplete.";
        Responses[403] = "Only administrators can send a test message.";
        Responses[429] = "Too many test messages from this client; wait and retry.";
    }
}
