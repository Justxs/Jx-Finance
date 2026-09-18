using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Refresh;

public sealed class RefreshSummary : Summary<RefreshEndpoint>
{
    public RefreshSummary()
    {
        Summary = "Renew the access token";
        Description = "Exchanges the refresh cookie for a new access token cookie and a rotated refresh cookie. "
            + "Call it when a request answers 401, then retry that request once. The session keeps its original "
            + "absolute expiry; renewing never extends it. A session whose user was deactivated, locked out, or had "
            + "their role or password changed elsewhere is rejected.";
        Responses[204] = "New cookies issued.";
        Responses[401] = "The refresh cookie is missing, expired, or revoked; sign in again.";
        Responses[429] = "Too many renewals; wait and retry.";
    }
}
