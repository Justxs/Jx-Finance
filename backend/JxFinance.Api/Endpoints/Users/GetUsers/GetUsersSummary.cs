using FastEndpoints;

namespace JxFinance.Endpoints.Users.GetUsers;

public sealed class GetUsersSummary : Summary<GetUsersEndpoint, GetUsersRequest>
{
    public GetUsersSummary()
    {
        Summary = "List users";
        Description = "Returns user accounts with their role and whether they are still active. "
            + "Filters are optional and combine with AND. Administrators only.";
        RequestParam(r => r.Search, "Case-insensitive match against the display name or email.");
        RequestParam(r => r.Role, "Keep only users in this role.");
        RequestParam(r => r.IsActive, "True for active accounts, false for deactivated ones.");
        RequestParam(r => r.Sort, "Field to sort by. Defaults to display name.");
        RequestParam(r => r.Direction, "Asc or Desc. Defaults to Asc.");
        Responses[200] = "The matching user accounts.";
        Responses[403] = "The signed-in user is not an administrator.";
    }
}
