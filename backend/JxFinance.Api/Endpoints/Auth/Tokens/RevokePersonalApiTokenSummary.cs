using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Tokens;

public sealed class RevokePersonalApiTokenSummary : Summary<RevokePersonalApiTokenEndpoint>
{
    public RevokePersonalApiTokenSummary()
    {
        Summary = "Revoke a personal API token";
        Description = "Deletes one of your tokens, so the next request that carries it answers 401 token.invalid. "
            + "Needs the ApiTokens feature switch.";
        Params["id"] = "The token id, as returned by the token list.";
        Responses[204] = "The token is gone.";
        Responses[404] = "No token with this id belongs to the signed-in user, or the ApiTokens feature is off.";
    }
}
