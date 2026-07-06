using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Auth;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.CreateUser;

public sealed class CreateUserEndpoint(IUserService userService) : Endpoint<CreateUserRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Post("/api/users");
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(CreateUserRequest req, CancellationToken ct)
    {
        var result = await userService.CreateAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.ResultAsync(Results.Created($"/api/users/{result.Value!.Id}", result.Value));
    }
}
