using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.Identity;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class SetupTwoFactorEndpoint(IAuthService authService, ICurrentUser currentUser, UserManager<AppUser> users, SignInManager<AppUser> signIn)
    : Endpoint<ReauthenticateRequest, TwoFactorSetupResponse>
{
    public override void Configure()
    {
        Post("/api/auth/2fa/setup");
        Throttle(5, 300);
    }

    public override async Task HandleAsync(ReauthenticateRequest req, CancellationToken ct)
    {
        var user = await authService.FindByIdAsync(currentUser.Id, ct);
        if (user is null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        if (user.TwoFactorEnabled || string.IsNullOrWhiteSpace(req.Password) || !await users.CheckPasswordAsync(user, req.Password))
        {
            await Send.UnauthorizedAsync(ct);
            return;
        }
        var setup = await authService.BeginTwoFactorSetupAsync(user);
        await signIn.RefreshSignInAsync(user);
        await Send.OkAsync(setup, ct);
    }
}
