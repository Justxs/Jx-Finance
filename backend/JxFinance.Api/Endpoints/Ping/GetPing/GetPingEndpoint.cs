using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Ping.Interfaces;

namespace JxFinance.Endpoints.Ping.GetPing;

public sealed class GetPingEndpoint(IPingService pingService)
    : EndpointWithoutRequest<GetPingResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Ping);
        Group<DiagnosticsGroup>();
        AllowAnonymous();
    }

    public override Task HandleAsync(CancellationToken ct)
    {
        var status = pingService.GetStatus();
        return Send.OkAsync(new GetPingResponse(status.Message, status.TimestampUtc), ct);
    }
}
