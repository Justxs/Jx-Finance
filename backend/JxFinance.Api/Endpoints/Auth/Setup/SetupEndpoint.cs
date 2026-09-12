using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Shared;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class SetupEndpoint(IAuthService authService) : Endpoint<SetupRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Post("setup");
        Group<SetupGroup>();
        AllowAnonymous();
        Throttle(hitLimit: 5, durationSeconds: 300);
        Description(d => d.Produces(429).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(SetupRequest req, CancellationToken ct)
    {
        var user = (await authService.ProvisionAdminAsync(req.Email.Trim(), req.Password, req.DisplayName.Trim(), ct))
            .ValueOrThrow();

        var profile = await authService.ToProfileAsync(user);
        await Send.OkAsync(profile, ct);
    }
}
