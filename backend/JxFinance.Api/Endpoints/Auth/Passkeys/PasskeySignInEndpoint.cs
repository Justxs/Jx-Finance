using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Login;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class PasskeySignInEndpoint(IPasskeyService passkeyService)
    : Endpoint<PasskeySignInRequest, LoginResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/passkeys/sign-in");
        Group<AuthGroup>();
        AllowAnonymous();
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.Produces(429).ProducesProblemDetails(401));
    }

    public override async Task HandleAsync(PasskeySignInRequest req, CancellationToken ct)
    {
        var signedIn = await passkeyService.SignInAsync(req, ct);
        if (signedIn.TryGetValue(out var response))
        {
            await Send.OkAsync(response, ct);
            return;
        }

        var status = signedIn.ErrorCode == ErrorCodes.PasskeyInvalid
            ? StatusCodes.Status401Unauthorized
            : ErrorCodes.StatusCodeFor(signedIn.ErrorCode);
        await Send.ProblemAsync(signedIn.Error, status, ct);
    }
}
