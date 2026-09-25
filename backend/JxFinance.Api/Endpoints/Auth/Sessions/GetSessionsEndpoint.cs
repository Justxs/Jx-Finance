using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Sessions;

public sealed class GetSessionsEndpoint(ISessionService sessionService)
    : EndpointWithoutRequest<IReadOnlyList<SessionResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Auth + "/sessions");
        Group<AuthGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await sessionService.GetSessionsAsync(ct), ct);
}
