using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Shared;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class DisableTwoFactorEndpoint(IAuthService authService, ICurrentUser currentUser, ISessionService sessions)
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
        var user = await authService.FindByIdAsync(currentUser.Id, ct);
        if (user is null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        (await authService.ConfirmPasswordAsync(user, req.Password, ErrorCodes.CredentialsInvalid)).EnsureSuccess();
        await authService.DisableTwoFactorAsync(user);
        await sessions.RenewAsync(user, ct);
        await Send.NoContentAsync(ct);
    }
}
