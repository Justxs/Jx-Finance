using FastEndpoints;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Sessions;

public sealed class RevokeOtherSessionsEndpoint(ISessionService sessionService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post("auth/sessions/revoke-others");
        Group<AuthGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await sessionService.RevokeOthersAsync(ct);
        await Send.NoContentAsync(ct);
    }
}
