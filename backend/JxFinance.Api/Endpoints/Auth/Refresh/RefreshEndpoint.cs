using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Refresh;

public sealed class RefreshEndpoint(ISessionService sessionService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/refresh");
        Group<AuthGroup>();
        AllowAnonymous();
        Throttle(hitLimit: 60, durationSeconds: 300);
        Description(d => d.Produces(429));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        if (!await sessionService.RefreshAsync(ct))
        {
            await Send.UnauthorizedAsync(ct);
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
