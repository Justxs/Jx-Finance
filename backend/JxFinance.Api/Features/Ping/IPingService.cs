namespace JxFinance.Api.Features.Ping;

// Service-layer status; the endpoint maps it to its own response DTO.
public sealed record PingStatus(string Message, DateTimeOffset TimestampUtc);

// Feature service: the use-case seam endpoints (and later, background jobs) call into.
public interface IPingService
{
    PingStatus GetStatus();
}
