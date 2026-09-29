using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Login;

public sealed class LoginEndpoint(IAuthService authService)
    : Endpoint<LoginRequest, LoginResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/login");
        Group<AuthGroup>();
        AllowAnonymous();
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.Produces(429).ProducesProblemDetails(401));
    }

    public override async Task HandleAsync(LoginRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await authService.LoginAsync(req, ct), ct);
}
