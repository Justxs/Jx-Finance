using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Ping.GetPing;

public sealed class GetPingEndpoint(IClock clock)
    : EndpointWithoutRequest<GetPingResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Ping);
        Group<DiagnosticsGroup>();
        AllowAnonymous();
    }

    public override Task HandleAsync(CancellationToken ct) =>
        Send.OkAsync(new GetPingResponse("pong", clock.UtcNow), ct);
}
