using FastEndpoints;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.CreateUser;

public sealed class CreateUserSummary : Summary<CreateUserEndpoint, CreateUserRequest>
{
    public CreateUserSummary()
    {
        Summary = "Create a user";
        Description = "Provisions a user account with an initial password. There is no self-service "
            + "sign-up: accounts exist only because an administrator created them. Administrators only.";
        ExampleRequest = new CreateUserRequest("partner@example.com", "Partner", AppRoles.Member, "correct horse battery staple");
        RequestParam(r => r.Role, "Admin or Member.");
        RequestParam(r => r.Password, "Initial password; the user can change it from their profile.");
        Responses[201] = "The user was created. The Location header points at it.";
        Responses[400] = "Validation failed, or the email is already taken.";
        Responses[403] = "The signed-in user is not an administrator.";
    }
}
