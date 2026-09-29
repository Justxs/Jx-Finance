using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class BeginPasskeySignInEndpoint(IPasskeyService passkeyService)
    : EndpointWithoutRequest<PasskeyOptionsResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/passkeys/sign-in-options");
        Group<AuthGroup>();
        AllowAnonymous();
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.Produces(429));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkOrProblemAsync(await passkeyService.BeginSignInAsync(), ct);
}
