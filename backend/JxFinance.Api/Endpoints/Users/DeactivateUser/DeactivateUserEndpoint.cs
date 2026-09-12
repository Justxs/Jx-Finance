using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.DeactivateUser;

public sealed class DeactivateUserEndpoint(IUserService userService, ICurrentUser currentUser) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post("users/{id}/deactivate");
        Group<UsersGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await userService.DeactivateAsync(Route<Guid>("id"), currentUser.Id, ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
