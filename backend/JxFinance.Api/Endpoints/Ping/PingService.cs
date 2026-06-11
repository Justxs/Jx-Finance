namespace JxFinance.Endpoints.Ping;

public sealed class PingService : IPingService
{
    public PingStatus GetStatus() => new("pong", DateTimeOffset.UtcNow);
}
