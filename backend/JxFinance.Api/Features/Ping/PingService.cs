namespace JxFinance.Api.Features.Ping;

public sealed class PingService : IPingService
{
    public PingStatus GetStatus() => new("pong", DateTimeOffset.UtcNow);
}
