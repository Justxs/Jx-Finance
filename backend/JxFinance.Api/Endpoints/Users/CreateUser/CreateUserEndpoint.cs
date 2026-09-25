using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.CreateUser;

public sealed class CreateUserEndpoint(IUserService userService) : Endpoint<CreateUserRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Users);
        Group<UsersGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403));
        Description(d => d.ProducesCreated<UserProfileResponse>());
    }

    public override async Task HandleAsync(CreateUserRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(await userService.CreateAsync(req, ct), user => $"{ApiRoutes.UsersPath}/{user.Id}", ct);
}
