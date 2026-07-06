using FastEndpoints;
using JxFinance.Endpoints.Auth;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.GetUsers;

public sealed class GetUsersEndpoint(IUserService userService) : EndpointWithoutRequest<IReadOnlyList<UserProfileResponse>>
{
    public override void Configure()
    {
        Get("/api/users");
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var users = await userService.GetAllAsync(ct);
        await Send.OkAsync(users, ct);
    }
}
