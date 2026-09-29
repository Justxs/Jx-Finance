using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class RemovePasskeySummary : Summary<RemovePasskeyEndpoint>
{
    public RemovePasskeySummary()
    {
        Summary = "Remove a passkey";
        Description = "Deletes one of your passkeys, so it can no longer sign in. Sessions that are already open stay open; "
            + "sign out everywhere else to end them.";
        Params["id"] = "The base64url credential id, as returned by the passkey list.";
        Responses[204] = "The passkey is gone.";
        Responses[404] = "No passkey with this id belongs to the signed-in user.";
    }
}
