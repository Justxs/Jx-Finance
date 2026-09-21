using FastEndpoints;

namespace JxFinance.Endpoints.Auth.SendVerificationEmail;

public sealed class SendVerificationEmailSummary : Summary<SendVerificationEmailEndpoint>
{
    public SendVerificationEmailSummary()
    {
        Summary = "Send the confirmation email again";
        Description = "Queues a new confirmation link for the caller's own address. Answers 400 email.alreadyVerified "
            + "when the address is already confirmed and 400 email.notConfigured when this installation has no mail "
            + "server yet, so the screen can say which of the two it is. The message leaves through the outbox, so the "
            + "call returns without waiting for the mail server. Rate limited to 5 calls per five minutes per client.";
        Responses[204] = "A confirmation email is queued.";
        Responses[400] = "The address is already confirmed, or this installation cannot send email.";
        Responses[404] = "The caller no longer exists.";
        Responses[429] = "Too many requests from this client; wait and retry.";
    }
}
