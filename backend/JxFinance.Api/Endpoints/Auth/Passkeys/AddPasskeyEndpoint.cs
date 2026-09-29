using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class AddPasskeyEndpoint(IPasskeyService passkeyService)
    : Endpoint<AddPasskeyRequest, PasskeyResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/passkeys");
        Group<AuthGroup>();
        Description(d => d.ProducesCreated<PasskeyResponse>().ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(AddPasskeyRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(
            await passkeyService.AddAsync(req, ct),
            passkey => passkey.Id,
            ct);
}
