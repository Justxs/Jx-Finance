using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class BeginPasskeySignInSummary : Summary<BeginPasskeySignInEndpoint>
{
    public BeginPasskeySignInSummary()
    {
        Summary = "Begin signing in with a passkey";
        Description = "Anonymous. Returns WebAuthn request options as JSON text, ready for "
            + "PublicKeyCredential.parseRequestOptionsFromJSON, with no allowed credentials, so the authenticator "
            + "offers the passkeys it holds for this site. The challenge travels in a protected, five-minute, "
            + "single-use cookie; post the assertion to POST /api/auth/passkeys/sign-in. "
            + "Rate limited to 10 calls per five minutes per client.";
        Responses[200] = "The request options.";
        Responses[400] = "This installation cannot offer passkeys (passkey.unavailable).";
        Responses[429] = "Too many attempts from this client; wait and retry.";
    }
}
