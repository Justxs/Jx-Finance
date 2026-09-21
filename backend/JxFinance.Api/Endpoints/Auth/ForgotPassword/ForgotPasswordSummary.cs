using FastEndpoints;

namespace JxFinance.Endpoints.Auth.ForgotPassword;

public sealed class ForgotPasswordSummary : Summary<ForgotPasswordEndpoint, ForgotPasswordRequest>
{
    public ForgotPasswordSummary()
    {
        Summary = "Ask for a password reset link";
        Description = "Queues an email with a single-use reset link when the address belongs to an active user of this "
            + "installation and the mail server is configured. The answer is 204 in every case, including an unknown "
            + "address, a deactivated user and an installation that cannot send mail, so the screen cannot be used to "
            + "find out which addresses exist. The link is valid for one hour and stops working as soon as it is used, "
            + "because the token carries the user's security stamp and a completed reset changes that stamp. Asking for "
            + "a reset never counts toward the failed-attempt lockout: otherwise anyone could lock an account by "
            + "repeating the request. Rate limited to 5 calls per five minutes per client.";
        ExampleRequest = new ForgotPasswordRequest("you@example.com");
        Responses[204] = "The request was accepted; an email is on its way if the address can receive one.";
        Responses[429] = "Too many requests from this client; wait and retry.";
    }
}
