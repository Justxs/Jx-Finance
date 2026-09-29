using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class GetPasskeysEndpoint(IPasskeyService passkeyService)
    : EndpointWithoutRequest<IReadOnlyList<PasskeyResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Auth + "/passkeys");
        Group<AuthGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await passkeyService.ListAsync(ct), ct);
}
