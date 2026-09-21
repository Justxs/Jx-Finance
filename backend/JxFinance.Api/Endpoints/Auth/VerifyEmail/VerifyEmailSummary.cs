using FastEndpoints;

namespace JxFinance.Endpoints.Auth.VerifyEmail;

public sealed class VerifyEmailSummary : Summary<VerifyEmailEndpoint, VerifyEmailRequest>
{
    public VerifyEmailSummary()
    {
        Summary = "Confirm an email address";
        Description = "Consumes the token from the confirmation link and marks the address confirmed. The token is "
            + "ASP.NET Identity's own email-confirmation token and is valid for one day. Opening the link again after "
            + "the address is confirmed answers 204, so a second click is not an error; an unknown address, an expired "
            + "token and a tampered token answer 400 email.tokenInvalid. The call needs no session, because the person "
            + "reading the mailbox may not be signed in. An unconfirmed address blocks nothing but unsolicited mail to "
            + "it, so nothing else changes. Rate limited to 10 calls per five minutes per client.";
        ExampleRequest = new VerifyEmailRequest("you@example.com", "CfDJ8…");
        RequestParam(r => r.Token, "The token from the emailed link, sent back unchanged.");
        Responses[204] = "The address is confirmed.";
        Responses[400] = "The link is no longer valid; ask for a new one from the profile.";
        Responses[429] = "Too many attempts from this client; wait and retry.";
    }
}
