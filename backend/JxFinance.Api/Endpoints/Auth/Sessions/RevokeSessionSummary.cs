using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Sessions;

public sealed class RevokeSessionSummary : Summary<RevokeSessionEndpoint>
{
    public RevokeSessionSummary()
    {
        Summary = "Sign another browser out";
        Description = "Deletes one of the caller's other sessions. That browser is refused on its next request, "
            + "because every request checks that its session still exists, and it cannot refresh. "
            + "The session that makes the request is refused with session.current; it ends through sign out.";
        Params["id"] = "The id of the session, as returned by the session list.";
        Responses[204] = "The session is gone.";
        Responses[403] = "The id is the current session; sign out instead.";
        Responses[404] = "No session with this id belongs to the signed-in user.";
    }
}
