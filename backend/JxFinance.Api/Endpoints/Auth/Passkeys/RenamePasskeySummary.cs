using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class RenamePasskeySummary : Summary<RenamePasskeyEndpoint, RenamePasskeyRequest>
{
    public RenamePasskeySummary()
    {
        Summary = "Rename a passkey";
        Description = "Changes the name the list shows for one of your passkeys. Nothing else about the passkey changes.";
        ExampleRequest = new RenamePasskeyRequest("pQx0Yq1bTj6T0l7c3m2hVw", "Phone");
        Params["id"] = "The base64url credential id, as returned by the passkey list.";
        Responses[200] = "The renamed passkey.";
        Responses[400] = "Validation failed.";
        Responses[404] = "No passkey with this id belongs to the signed-in user.";
    }
}
