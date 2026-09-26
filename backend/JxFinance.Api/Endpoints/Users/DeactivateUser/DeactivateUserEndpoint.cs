using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.DeactivateUser;

public sealed class DeactivateUserEndpoint(IUserService userService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post(ApiRoutes.Users + "/{id}/deactivate");
        Group<UsersGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await userService.DeactivateAsync(Route<Guid>("id"), ct), ct);
}
