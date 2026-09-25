using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.UpdateUserRole;

public sealed class UpdateUserRoleEndpoint(IUserService userService, ICurrentUser currentUser)
    : Endpoint<UpdateUserRoleRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Users + "/{id}/role");
        Group<UsersGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateUserRoleRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await userService.ChangeRoleAsync(req.Id, req, currentUser.Id, ct), ct);
}
