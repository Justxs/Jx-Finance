using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Me;

public sealed class MeSummary : Summary<MeEndpoint>
{
    public MeSummary()
    {
        Summary = "Get the signed-in profile";
        Description = "Returns the profile behind the current session cookie, including the role and "
            + "whether two-factor authentication is on. The client uses this to decide what to render "
            + "and to detect an expired session.";
        Responses[200] = "The profile of the signed-in user.";
        Responses[404] = "The session points at a user that no longer exists.";
    }
}
