using FastEndpoints;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.UpdateUserRole;

public sealed class UpdateUserRoleSummary : Summary<UpdateUserRoleEndpoint, UpdateUserRoleRequest>
{
    public UpdateUserRoleSummary()
    {
        Summary = "Change a user role";
        Description = "Promotes a user to administrator or demotes them to member. You cannot demote "
            + "yourself, and the last administrator cannot be demoted, so an instance is never left "
            + "without one. Administrators only.";
        ExampleRequest = new UpdateUserRoleRequest(Guid.Empty, AppRoles.Admin);
        Params["id"] = "The user id. Takes precedence over the id in the body.";
        RequestParam(r => r.Role, "Admin or Member.");
        Responses[200] = "The updated profile.";
        Responses[400] = "Unknown role.";
        Responses[403] = "The signed-in user is not an administrator, or the change would leave no administrator.";
        Responses[404] = "No such user.";
    }
}
