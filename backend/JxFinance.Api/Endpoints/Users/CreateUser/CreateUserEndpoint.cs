using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
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
        Description(d => d.ClearDefaultProduces(200).Produces<UserProfileResponse>(201, MediaTypeNames.Application.Json));
    }

    public override async Task HandleAsync(CreateUserRequest req, CancellationToken ct)
    {
        var user = (await userService.CreateAsync(req, ct)).ValueOrThrow();
        await Send.ResultAsync(TypedResults.Created($"{ApiRoutes.UsersPath}/{user.Id}", user));
    }
}
