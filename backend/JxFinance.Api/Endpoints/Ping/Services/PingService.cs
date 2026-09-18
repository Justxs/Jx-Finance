using FastEndpoints;
using JxFinance.Endpoints.Ping.Interfaces;

namespace JxFinance.Endpoints.Ping.Services;

[RegisterService<IPingService>(LifeTime.Scoped)]
public sealed class PingService : IPingService
{
    public PingStatus GetStatus() => new("pong", DateTimeOffset.UtcNow);
}
