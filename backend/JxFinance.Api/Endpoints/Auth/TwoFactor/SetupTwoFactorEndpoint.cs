using FastEndpoints;
using FluentValidation;
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
        Post("auth/2fa/setup");
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
            ThrowError("The password could not be confirmed.", ErrorCodes.CredentialsInvalid, Severity.Error, StatusCodes.Status401Unauthorized);
        }

        (await authService.ConfirmPasswordAsync(user, req.Password, ErrorCodes.CredentialsInvalid)).EnsureSuccess();
        var setup = await authService.BeginTwoFactorSetupAsync(user);
        await sessions.RenewAsync(user, ct);
        await Send.OkAsync(setup, ct);
    }
}
