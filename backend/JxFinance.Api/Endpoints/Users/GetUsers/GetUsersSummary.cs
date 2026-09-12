using FastEndpoints;

namespace JxFinance.Endpoints.Users.GetUsers;

public sealed class GetUsersSummary : Summary<GetUsersEndpoint>
{
    public GetUsersSummary()
    {
        Summary = "List users";
        Description = "Returns every user account with its role and whether it is still active. "
            + "Administrators only.";
        Responses[200] = "All user accounts.";
        Responses[403] = "The signed-in user is not an administrator.";
    }
}
