using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Tokens;

public sealed class GetPersonalApiTokensSummary : Summary<GetPersonalApiTokensEndpoint>
{
    public GetPersonalApiTokensSummary()
    {
        Summary = "List your personal API tokens";
        Description = "Returns the signed-in user's tokens, newest first: the name, the public prefix, when each was created, "
            + "when it expires and when it was last used, to the minute. Expired tokens stay listed, marked as expired, "
            + "until they are removed 30 days after expiry. The secret is never returned. Needs the ApiTokens feature switch.";
        Responses[200] = "The tokens of the signed-in user.";
        Responses[404] = "The ApiTokens feature is off (feature.disabled).";
    }
}
