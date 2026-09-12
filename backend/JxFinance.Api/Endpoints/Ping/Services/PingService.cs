using JxFinance.Endpoints.Ping.Interfaces;

namespace JxFinance.Endpoints.Ping.Services;

public sealed class PingService : IPingService
{
    public PingStatus GetStatus() => new("pong", DateTimeOffset.UtcNow);
}
