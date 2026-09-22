using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.ResetUserPassword;

public sealed class ResetUserPasswordEndpoint(IUserService userService, ICurrentUser currentUser)
    : Endpoint<ResetUserPasswordRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Users + "/{id}/reset-password");
        Group<UsersGroup>();
        Roles(AppRoles.Admin);
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404).Produces(429));
    }

    public override async Task HandleAsync(ResetUserPasswordRequest req, CancellationToken ct)
    {
        await Send.OkOrProblemAsync(await userService.ResetPasswordAsync(req.Id, req, currentUser.Id, ct), ct);
    }
}
