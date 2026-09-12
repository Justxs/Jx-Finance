using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.Identity;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class DisableTwoFactorEndpoint(IAuthService authService, ICurrentUser currentUser, UserManager<AppUser> users, SignInManager<AppUser> signIn)
    : Endpoint<ReauthenticateRequest>
{
    public override void Configure()
    {
        Post("/api/auth/2fa/disable");
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

        if (string.IsNullOrWhiteSpace(req.Password) || !await users.CheckPasswordAsync(user, req.Password))
        {
            await Send.UnauthorizedAsync(ct);
            return;
        }
        await authService.DisableTwoFactorAsync(user);
        await signIn.RefreshSignInAsync(user);
        await Send.NoContentAsync(ct);
    }
}
