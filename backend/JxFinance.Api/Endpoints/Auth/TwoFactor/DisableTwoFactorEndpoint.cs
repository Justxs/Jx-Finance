using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Shared;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class DisableTwoFactorEndpoint(IAuthService authService, ISessionService sessions)
    : Endpoint<ReauthenticateRequest>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/2fa/disable");
        Group<AuthGroup>();
        Throttle(5, 300);
        Description(d => d.Produces(429).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(ReauthenticateRequest req, CancellationToken ct)
    {
        if (await authService.CurrentAsync(ct) is not { } user)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        var confirmed = await authService.ConfirmPasswordAsync(user, req.Password, ErrorCodes.CredentialsInvalid);
        if (confirmed.IsFailure)
        {
            await Send.ProblemAsync(confirmed.Error, ct);
            return;
        }

        await authService.DisableTwoFactorAsync(user);
        await sessions.RenewAsync(user, ct);
        await Send.NoContentAsync(ct);
    }
}
