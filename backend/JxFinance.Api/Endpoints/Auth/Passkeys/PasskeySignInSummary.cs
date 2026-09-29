using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class PasskeySignInSummary : Summary<PasskeySignInEndpoint, PasskeySignInRequest>
{
    public PasskeySignInSummary()
    {
        Summary = "Sign in with a passkey";
        Description = "Anonymous. Verifies the assertion the browser made from the sign-in options and signs the owner of the "
            + "passkey in exactly as a password sign-in does: a session row and the jx_access and jx_refresh cookies. "
            + "A user-verified passkey is a whole sign-in, so no email, password or authenticator code is asked. "
            + "A failed assertion never counts toward the account lockout, and a temporarily locked-out account may "
            + "still sign in this way; a completed sign-in resets the failed-attempt counter. "
            + "Rate limited to 10 attempts per five minutes per client.";
        ExampleRequest = new PasskeySignInRequest("{\"id\":\"...\",\"type\":\"public-key\",\"response\":{}}", false);
        RequestParam(r => r.CredentialJson, "JSON text of PublicKeyCredential.toJSON() from navigator.credentials.get().");
        RequestParam(r => r.RememberMe, "Keeps the session for 30 days instead of one day.");
        Responses[200] = "Signed in; twoFactorRequired is always false.";
        Responses[400] = "Validation failed, or the ceremony state is missing or expired (passkey.stateInvalid).";
        Responses[401] = "The assertion did not verify (passkey.invalid), or the account is deactivated (credentials.invalid).";
        Responses[429] = "Too many attempts from this client; wait and retry.";
    }
}
