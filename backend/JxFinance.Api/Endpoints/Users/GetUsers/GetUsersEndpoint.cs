using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.GetUsers;

public sealed class GetUsersEndpoint(IUserService userService)
    : Endpoint<GetUsersRequest, IReadOnlyList<UserProfileResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Users);
        Group<UsersGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403));
    }

    public override async Task HandleAsync(GetUsersRequest req, CancellationToken ct)
    {
        var users = await userService.GetAllAsync(req, ct);
        await Send.OkAsync(users, ct);
    }
}
