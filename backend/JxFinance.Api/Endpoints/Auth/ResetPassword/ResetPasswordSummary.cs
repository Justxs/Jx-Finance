using FastEndpoints;

namespace JxFinance.Endpoints.Auth.ResetPassword;

public sealed class ResetPasswordSummary : Summary<ResetPasswordEndpoint, ResetPasswordRequest>
{
    public ResetPasswordSummary()
    {
        Summary = "Set a new password from a reset link";
        Description = "Consumes the token from the emailed link and stores the new password. The token is ASP.NET "
            + "Identity's own password-reset token: it carries the user's security stamp, so the completed reset "
            + "invalidates it and a second attempt with the same link answers 400 passwordReset.tokenInvalid. An "
            + "unknown address, a deactivated user, an expired token and a tampered token all answer with that same "
            + "code, so nothing is learned from the difference. A password the validators refuse answers "
            + "password.tooWeak. A successful reset clears the failed-attempt counter and a temporary lockout, changes "
            + "the security stamp and therefore ends every open session of that user; a deactivation stays in place. "
            + "A rejected token does not count toward the lockout. Rate limited to 10 calls per five minutes per client.";
        ExampleRequest = new ResetPasswordRequest("you@example.com", "CfDJ8…", "correct horse battery staple");
        RequestParam(r => r.Token, "The token from the emailed link, sent back unchanged.");
        Responses[204] = "The password was changed; sign in with it.";
        Responses[400] = "The link is no longer valid, or the new password was refused.";
        Responses[429] = "Too many attempts from this client; wait and retry.";
    }
}
