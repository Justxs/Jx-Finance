using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.CreateUser;

public sealed class CreateUserEndpoint(IUserService userService) : Endpoint<CreateUserRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Post("users");
        Group<UsersGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403));
        Description(d => d.ClearDefaultProduces(200).Produces<UserProfileResponse>(201, "application/json"));
    }

    public override async Task HandleAsync(CreateUserRequest req, CancellationToken ct)
    {
        var user = (await userService.CreateAsync(req, ct)).ValueOrThrow();
        await Send.ResultAsync(TypedResults.Created($"/api/users/{user.Id}", user));
    }
}
