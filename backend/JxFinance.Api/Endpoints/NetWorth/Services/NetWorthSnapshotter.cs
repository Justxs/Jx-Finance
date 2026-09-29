using FastEndpoints;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.NetWorth.Services;

[RegisterService<INetWorthSnapshotter>(LifeTime.Singleton)]
public sealed class NetWorthSnapshotter(IServiceScopeFactory scopes) : INetWorthSnapshotter
{
    public async Task SnapshotAsync(Guid userId, CancellationToken cancellationToken)
    {
        await using var scope = scopes.CreateUserScope(userId);
        await scope.ServiceProvider.GetRequiredService<INetWorthService>().GetCurrentAsync(cancellationToken);
    }
}
