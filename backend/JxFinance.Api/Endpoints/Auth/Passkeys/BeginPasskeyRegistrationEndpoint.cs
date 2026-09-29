using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Shared;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class BeginPasskeyRegistrationEndpoint(IPasskeyService passkeyService)
    : Endpoint<ReauthenticateRequest, PasskeyOptionsResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/passkeys/registration-options");
        Group<AuthGroup>();
        Throttle(5, 300);
        Description(d => d.Produces(429).ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(ReauthenticateRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await passkeyService.BeginRegistrationAsync(req.Password, ct), ct);
}
