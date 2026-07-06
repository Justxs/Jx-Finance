using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Users.DeactivateUser;

public sealed class DeactivateUserEndpoint(IUserService userService, ICurrentUser currentUser) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post("/api/users/{id}/deactivate");
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(404).ProducesProblemDetails(403));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await userService.DeactivateAsync(Route<Guid>("id"), currentUser.Id, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
