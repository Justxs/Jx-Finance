using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Sessions;

public sealed class RevokeOtherSessionsSummary : Summary<RevokeOtherSessionsEndpoint>
{
    public RevokeOtherSessionsSummary()
    {
        Summary = "Sign out everywhere else";
        Description = "Deletes every session of the caller except the one that makes the request, "
            + "including expired and stale rows. Safe to call when no other session exists.";
        Responses[204] = "Only the current session is left.";
    }
}
