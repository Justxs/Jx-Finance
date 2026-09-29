using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class RemovePasskeyEndpoint(IPasskeyService passkeyService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete(ApiRoutes.Auth + "/passkeys/{id}");
        Group<AuthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await passkeyService.RemoveAsync(Route<string>("id")!, ct), ct);
}
