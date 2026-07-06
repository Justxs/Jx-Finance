using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.UpdateUserRole;

public sealed class UpdateUserRoleEndpoint(IUserService userService, ICurrentUser currentUser)
    : Endpoint<UpdateUserRoleRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Put("/api/users/{id}/role");
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(404).ProducesProblemDetails(403));
    }

    public override async Task HandleAsync(UpdateUserRoleRequest req, CancellationToken ct)
    {
        var result = await userService.ChangeRoleAsync(req.Id, req, currentUser.Id, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
