using FastEndpoints;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Sessions;

public sealed class GetSessionsEndpoint(ISessionService sessionService)
    : EndpointWithoutRequest<IReadOnlyList<SessionResponse>>
{
    public override void Configure()
    {
        Get("auth/sessions");
        Group<AuthGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var sessions = await sessionService.GetSessionsAsync(ct);
        await Send.OkAsync(sessions, ct);
    }
}
