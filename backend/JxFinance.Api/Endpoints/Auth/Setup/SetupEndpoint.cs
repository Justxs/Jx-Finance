using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Shared;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class SetupEndpoint(IAuthService authService) : Endpoint<SetupRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Setup);
        Group<SetupGroup>();
        AllowAnonymous();
        Throttle(hitLimit: 5, durationSeconds: 300);
        Description(d => d.Produces(429).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(SetupRequest req, CancellationToken ct)
    {
        var provisioned = await authService.ProvisionAdminAsync(req.Email.Trim(), req.Password, req.DisplayName.Trim(), ct);
        if (!provisioned.TryGetValue(out var user))
        {
            await Send.ProblemAsync(provisioned.Error, ct);
            return;
        }

        var profile = await authService.ToProfileAsync(user);
        await Send.OkAsync(profile, ct);
    }
}
