using FastEndpoints;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.GetUsers;

public sealed class GetUsersEndpoint(IUserService userService) : EndpointWithoutRequest<IReadOnlyList<UserProfileResponse>>
{
    public override void Configure()
    {
        Get("users");
        Group<UsersGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var users = await userService.GetAllAsync(ct);
        await Send.OkAsync(users, ct);
    }
}
