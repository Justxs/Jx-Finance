using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.Interfaces;

namespace JxFinance.Endpoints.Users.UpdateMyDigestScopes;

public sealed class UpdateMyDigestScopesEndpoint(IUserService userService)
    : Endpoint<UpdateMyDigestScopesRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Users + "/me/digest-scopes");
        Group<UsersGroup>();
        Throttle(hitLimit: 20, durationSeconds: 300);
        Description(d => d.Produces(429));
    }

    public override async Task HandleAsync(UpdateMyDigestScopesRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await userService.UpdateOwnDigestScopesAsync(req, ct), ct);
}
