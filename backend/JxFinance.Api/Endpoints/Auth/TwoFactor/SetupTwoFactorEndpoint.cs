using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Shared;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class SetupTwoFactorEndpoint(IAuthService authService, ICurrentUser currentUser, ISessionService sessions)
    : Endpoint<ReauthenticateRequest, TwoFactorSetupResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/2fa/setup");
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

        if (user.TwoFactorEnabled)
        {
            await Send.ProblemAsync(new DomainError(ErrorCodes.CredentialsInvalid, "The password could not be confirmed."), ct);
            return;
        }

        var confirmed = await authService.ConfirmPasswordAsync(user, req.Password, ErrorCodes.CredentialsInvalid);
        if (confirmed.IsFailure)
        {
            await Send.ProblemAsync(confirmed.Error, ct);
            return;
        }

        var setup = await authService.BeginTwoFactorSetupAsync(user);
        await sessions.RenewAsync(user, ct);
        await Send.OkAsync(setup, ct);
    }
}
