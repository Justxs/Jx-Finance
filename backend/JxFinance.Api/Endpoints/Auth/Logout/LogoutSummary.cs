using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Logout;

public sealed class LogoutSummary : Summary<LogoutEndpoint>
{
    public LogoutSummary()
    {
        Summary = "Sign out";
        Description = "Ends the session and clears its cookies. Safe to call when already signed out.";
        Responses[204] = "The session is gone.";
    }
}
