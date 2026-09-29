using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Shared;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class DisableTwoFactorEndpoint(IAuthService authService)
    : Endpoint<ReauthenticateRequest>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/2fa/disable");
        Group<AuthGroup>();
        Throttle(5, 300);
        Description(d => d.Produces(429).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(ReauthenticateRequest req, CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await authService.DisableTwoFactorAsync(req.Password, ct), ct);
}
