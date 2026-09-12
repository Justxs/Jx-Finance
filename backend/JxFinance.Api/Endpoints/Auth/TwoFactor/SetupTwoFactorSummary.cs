using FastEndpoints;
using JxFinance.Endpoints.Auth.Shared;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class SetupTwoFactorSummary : Summary<SetupTwoFactorEndpoint, ReauthenticateRequest>
{
    public SetupTwoFactorSummary()
    {
        Summary = "Begin two-factor enrolment";
        Description = "Generates a fresh authenticator secret and returns it as both a shared key and "
            + "an otpauth URI for a QR code. Nothing is enabled yet: enrolment only completes once the "
            + "code from the authenticator is posted to the enable endpoint. Re-authentication with the "
            + "account password is required, and the call is rate limited to five attempts per five minutes.";
        ExampleRequest = new ReauthenticateRequest("correct horse battery staple");
        Responses[200] = "The shared key and otpauth URI to enrol with.";
        Responses[401] = "The password was wrong, or two-factor authentication is already enabled.";
        Responses[404] = "The session points at a user that no longer exists.";
        Responses[429] = "Too many attempts; wait and retry.";
    }
}
