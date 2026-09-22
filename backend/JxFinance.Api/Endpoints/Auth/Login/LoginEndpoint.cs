using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Login;

public sealed class LoginEndpoint(IAuthService authService, ISessionService sessionService)
    : Endpoint<LoginRequest, LoginResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/login");
        Group<AuthGroup>();
        AllowAnonymous();
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.Produces(429));
    }

    public override async Task HandleAsync(LoginRequest req, CancellationToken ct)
    {
        var credentials = await authService.ValidateCredentialsAsync(req.Email.Trim(), req.Password, ct);
        if (!credentials.TryGetValue(out var user))
        {
            await Send.ProblemAsync(credentials.Error, ct);
            return;
        }

        if (user.TwoFactorEnabled)
        {
            if (string.IsNullOrWhiteSpace(req.TwoFactorCode))
            {
                await Send.OkAsync(new LoginResponse(true, null), ct);
                return;
            }

            var consumed = await authService.ConsumeTwoFactorCodeAsync(user, req.TwoFactorCode);
            if (consumed.IsFailure)
            {
                var status = consumed.ErrorCode == ErrorCodes.TwoFactorInvalidCode
                    ? StatusCodes.Status401Unauthorized
                    : ErrorCodes.StatusCodeFor(consumed.ErrorCode);
                await Send.ProblemAsync(consumed.Error, status, ct);
                return;
            }
        }

        await sessionService.SignInAsync(user, req.RememberMe, ct);

        var profile = await authService.ToProfileAsync(user);
        await Send.OkAsync(new LoginResponse(false, profile), ct);
    }
}
