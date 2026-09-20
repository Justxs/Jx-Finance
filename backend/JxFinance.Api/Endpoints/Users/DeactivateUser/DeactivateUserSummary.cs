using FastEndpoints;

namespace JxFinance.Endpoints.Users.DeactivateUser;

public sealed class DeactivateUserSummary : Summary<DeactivateUserEndpoint>
{
    public DeactivateUserSummary()
    {
        Summary = "Deactivate a user";
        Description = "Locks the account out instead of deleting it, so the transactions and households "
            + "it touched stay intact. Existing sessions are rejected on their next request. You cannot "
            + "deactivate yourself, and the last active administrator cannot be deactivated, so an instance "
            + "is never left without one. Administrators only.";
        Params["id"] = "The user id.";
        Responses[204] = "The account is deactivated.";
        Responses[403] = "The signed-in user is not an administrator or is the target, or the change would leave no active administrator.";
        Responses[404] = "No such user.";
    }
}
