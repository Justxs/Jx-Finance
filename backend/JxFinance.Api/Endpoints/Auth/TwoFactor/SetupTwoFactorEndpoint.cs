using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Shared;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class SetupTwoFactorEndpoint(IAuthService authService)
    : Endpoint<ReauthenticateRequest, TwoFactorSetupResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/2fa/setup");
        Group<AuthGroup>();
        Throttle(5, 300);
        Description(d => d.Produces(429).ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(ReauthenticateRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await authService.SetupTwoFactorAsync(req.Password, ct), ct);
}
