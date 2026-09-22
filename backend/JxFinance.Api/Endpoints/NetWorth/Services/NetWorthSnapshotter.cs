using FastEndpoints;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Settings;
using JxFinance.Common.Sharing;
using JxFinance.Common.Trash;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Services;
using JxFinance.Endpoints.Investments.Services;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.NetWorth.Services;

[RegisterService<INetWorthSnapshotter>(LifeTime.Singleton)]
public sealed class NetWorthSnapshotter(IServiceScopeFactory scopes) : INetWorthSnapshotter
{
    public async Task SnapshotAsync(Guid userId, CancellationToken cancellationToken)
    {
        using var scope = scopes.CreateScope();
        var services = scope.ServiceProvider;
        var settings = services.GetRequiredService<IInstanceSettingsStore>();
        var rates = services.GetRequiredService<IExchangeRateService>();
        var user = new SnapshotUser(userId);
        var clock = services.GetRequiredService<IClock>();
        await using var db = new AppDbContext(services.GetRequiredService<DbContextOptions<AppDbContext>>(), user);
        var service = new NetWorthService(
            db,
            new AccountService(
                db,
                user,
                new SharingGuard(db, user),
                rates,
                new HoldingsValuation(db, rates, settings)),
            rates,
            clock,
            new DeletionRecorder(db, clock),
            user);
        await service.GetCurrentAsync(cancellationToken);
    }

    private sealed record SnapshotUser(Guid Id) : ICurrentUser;
}
