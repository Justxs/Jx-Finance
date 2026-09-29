using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class RenamePasskeyEndpoint(IPasskeyService passkeyService)
    : Endpoint<RenamePasskeyRequest, PasskeyResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Auth + "/passkeys/{id}");
        Group<AuthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(RenamePasskeyRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await passkeyService.RenameAsync(req, ct), ct);
}
