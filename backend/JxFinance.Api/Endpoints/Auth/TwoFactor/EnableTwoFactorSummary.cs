using FastEndpoints;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class EnableTwoFactorSummary : Summary<EnableTwoFactorEndpoint, EnableTwoFactorRequest>
{
    public EnableTwoFactorSummary()
    {
        Summary = "Finish two-factor enrolment";
        Description = "Verifies the first code produced by the authenticator and turns two-factor "
            + "authentication on. The response carries the one-time recovery codes; they are shown once "
            + "and never again, so the client must make the user save them before moving on.";
        ExampleRequest = new EnableTwoFactorRequest("123456");
        RequestParam(r => r.Code, "The six-digit code currently shown by the authenticator app.");
        Responses[200] = "Two-factor authentication is on. The recovery codes are returned once.";
        Responses[400] = "The code did not match the pending secret.";
        Responses[404] = "The session points at a user that no longer exists.";
    }
}
