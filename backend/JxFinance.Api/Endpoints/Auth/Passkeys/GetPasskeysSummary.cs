using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class GetPasskeysSummary : Summary<GetPasskeysEndpoint>
{
    public GetPasskeysSummary()
    {
        Summary = "List your passkeys";
        Description = "Returns the signed-in user's passkeys, oldest first: the base64url credential id, the name, when it "
            + "was added and whether it is synced between devices (backup eligible) or tied to one authenticator. "
            + "Public keys and sign counts are never returned.";
        Responses[200] = "The passkeys of the signed-in user.";
    }
}
