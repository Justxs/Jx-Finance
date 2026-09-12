using FastEndpoints;
using JxFinance.Endpoints.Auth.Shared;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class DisableTwoFactorSummary : Summary<DisableTwoFactorEndpoint, ReauthenticateRequest>
{
    public DisableTwoFactorSummary()
    {
        Summary = "Turn two-factor authentication off";
        Description = "Removes the authenticator secret and the remaining recovery codes after "
            + "re-authenticating with the account password. Rate limited to five attempts per five minutes.";
        ExampleRequest = new ReauthenticateRequest("correct horse battery staple");
        Responses[204] = "Two-factor authentication is off.";
        Responses[401] = "The password was wrong.";
        Responses[404] = "The session points at a user that no longer exists.";
        Responses[429] = "Too many attempts; wait and retry.";
    }
}
