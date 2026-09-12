using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;

namespace JxFinance.Endpoints.Auth.Login;

public sealed class LoginEndpoint(IAuthService authService, SignInManager<AppUser> signInManager)
    : Endpoint<LoginRequest, LoginResponse>
{
    private static readonly TimeSpan DefaultSessionLifetime = TimeSpan.FromDays(1);
    private static readonly TimeSpan RememberMeSessionLifetime = TimeSpan.FromDays(30);

    public override void Configure()
    {
        Post("auth/login");
        Group<AuthGroup>();
        AllowAnonymous();
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.Produces(429));
    }

    public override async Task HandleAsync(LoginRequest req, CancellationToken ct)
    {
        var user = (await authService.ValidateCredentialsAsync(req.Email.Trim(), req.Password, ct)).ValueOrThrow();

        if (user.TwoFactorEnabled)
        {
            if (string.IsNullOrWhiteSpace(req.TwoFactorCode))
            {
                await Send.OkAsync(new LoginResponse(true, null), ct);
                return;
            }

            if (!await authService.ConsumeTwoFactorCodeAsync(user, req.TwoFactorCode))
            {
                ThrowError(
                    "Invalid authenticator code.",
                    ErrorCodes.Unauthorized,
                    Severity.Error,
                    StatusCodes.Status401Unauthorized);
            }
        }

        var authProperties = new AuthenticationProperties
        {
            IsPersistent = req.RememberMe,
            ExpiresUtc = DateTimeOffset.UtcNow.Add(req.RememberMe ? RememberMeSessionLifetime : DefaultSessionLifetime),
        };

        await signInManager.SignInAsync(user, authProperties);

        var profile = await authService.ToProfileAsync(user);
        await Send.OkAsync(new LoginResponse(false, profile), ct);
    }
}
