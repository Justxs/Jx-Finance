using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Login;

public sealed class LoginEndpoint(IAuthService authService, ISessionService sessionService)
    : Endpoint<LoginRequest, LoginResponse>
{
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
                    ErrorCodes.TwoFactorInvalidCode,
                    Severity.Error,
                    StatusCodes.Status401Unauthorized);
            }
        }

        await sessionService.SignInAsync(user, req.RememberMe, ct);

        var profile = await authService.ToProfileAsync(user);
        await Send.OkAsync(new LoginResponse(false, profile), ct);
    }
}
