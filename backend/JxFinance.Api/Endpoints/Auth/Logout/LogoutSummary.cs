using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Logout;

public sealed class LogoutSummary : Summary<LogoutEndpoint>
{
    public LogoutSummary()
    {
        Summary = "Sign out";
        Description = "Clears the session cookie. Safe to call when already signed out.";
        Responses[204] = "The session is gone.";
    }
}
