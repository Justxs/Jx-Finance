using FastEndpoints;

namespace JxFinance.Endpoints.Users.ReactivateUser;

public sealed class ReactivateUserSummary : Summary<ReactivateUserEndpoint>
{
    public ReactivateUserSummary()
    {
        Summary = "Reactivate a deactivated user";
        Description = "Lifts the deactivation set by the deactivate operation and clears the failed sign-in "
            + "counter, so the user can sign in again with the password they had. Sessions from before the "
            + "deactivation stay revoked. Calling it for a user who is already active changes nothing and "
            + "still answers 204, so it is safe to repeat. Administrators only.";
        Params["id"] = "The user id.";
        Responses[204] = "The account is active.";
        Responses[403] = "The signed-in user is not an administrator.";
        Responses[404] = "No such user.";
    }
}
