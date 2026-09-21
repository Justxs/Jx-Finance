using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Sessions;

public sealed class GetSessionsSummary : Summary<GetSessionsEndpoint>
{
    public GetSessionsSummary()
    {
        Summary = "List signed-in browsers";
        Description = "Returns one row per browser that is signed in as the caller, most recently active first. "
            + "Expired sessions and sessions from before the last password or two-factor change are left out. "
            + "Each row carries the user agent sent at sign-in, when the session was created, last refreshed "
            + "and when it expires, and marks the session that made this request. Token hashes are never returned.";
        Responses[200] = "The live sessions of the signed-in user.";
    }
}
