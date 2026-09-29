using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class AddPasskeySummary : Summary<AddPasskeyEndpoint, AddPasskeyRequest>
{
    public AddPasskeySummary()
    {
        Summary = "Finish adding a passkey";
        Description = "Verifies the credential the browser created from the registration options and stores it under the "
            + "given name. The state cookie of the registration is read and deleted; it must belong to the signed-in "
            + "user and to this session and be less than five minutes old. User verification (a PIN or biometric) "
            + "is required and no attestation is checked.";
        ExampleRequest = new AddPasskeyRequest("{\"id\":\"...\",\"type\":\"public-key\",\"response\":{}}", "Chrome on Windows");
        RequestParam(r => r.CredentialJson, "JSON text of PublicKeyCredential.toJSON() from navigator.credentials.create().");
        RequestParam(r => r.Name, "A name for the list, at most 100 characters; the client sends the browser's label.");
        Responses[201] = "The passkey was added.";
        Responses[400] = "Validation failed, the ceremony state is missing, expired or not this session's (passkey.stateInvalid), "
            + "or the credential did not verify (passkey.invalid).";
        Responses[404] = "The session points at a user that no longer exists.";
        Responses[409] = "The account already holds ten passkeys (passkey.limitReached).";
    }
}
