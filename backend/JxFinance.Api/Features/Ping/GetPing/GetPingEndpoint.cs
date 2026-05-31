using FastEndpoints;

namespace JxFinance.Api.Features.Ping.GetPing;

public sealed class GetPingEndpoint(IPingService pingService)
    : EndpointWithoutRequest<GetPingResponse>
{
    public override void Configure()
    {
        Get("/api/ping");
        AllowAnonymous();
    }

    public override Task HandleAsync(CancellationToken ct)
    {
        var status = pingService.GetStatus();
        return Send.OkAsync(new GetPingResponse(status.Message, status.TimestampUtc), ct);
    }
}
