using FastEndpoints;
using JxFinance.Endpoints.Auth.Shared;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class BeginPasskeyRegistrationSummary : Summary<BeginPasskeyRegistrationEndpoint, ReauthenticateRequest>
{
    public BeginPasskeyRegistrationSummary()
    {
        Summary = "Begin adding a passkey";
        Description = "Confirms the account password and returns the WebAuthn creation options as JSON text, ready for "
            + "PublicKeyCredential.parseCreationOptionsFromJSON. The ceremony state travels in a protected, "
            + "five-minute, single-use cookie bound to this user and this session; post the credential to "
            + "POST /api/auth/passkeys to finish. The password counts toward the account lockout. "
            + "Rate limited to five attempts per five minutes.";
        ExampleRequest = new ReauthenticateRequest("correct horse battery staple");
        Responses[200] = "The creation options.";
        Responses[400] = "The password was wrong (password.incorrect), or this installation cannot offer passkeys (passkey.unavailable).";
        Responses[404] = "The session points at a user that no longer exists.";
        Responses[409] = "The account already holds ten passkeys (passkey.limitReached).";
        Responses[429] = "Too many attempts, or the account is locked after repeated failures.";
    }
}
