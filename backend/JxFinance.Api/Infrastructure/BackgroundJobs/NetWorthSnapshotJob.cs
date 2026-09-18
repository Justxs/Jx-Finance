using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Mappers;
using JxFinance.Endpoints.Accounts.Services;
using JxFinance.Endpoints.NetWorth.Services;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class NetWorthSnapshotJob(IServiceScopeFactory scopes, ILogger<NetWorthSnapshotJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        do
        {
            try { await RunOnceAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogError(ex, "Net worth snapshot failed."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    public async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        if (!scope.ServiceProvider.GetRequiredService<IInstanceSettingsStore>().Current.IsEnabled(Feature.NetWorth))
        {
            return;
        }

        var source = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();
        var options = scope.ServiceProvider.GetRequiredService<DbContextOptions<AppDbContext>>();
        var accountMapper = scope.ServiceProvider.GetRequiredService<AccountMapper>();
        var rates = scope.ServiceProvider.GetRequiredService<IExchangeRateService>();
        var ids = await source.Users.Where(u => u.PasswordHash != null &&
            (u.LockoutEnd == null || u.LockoutEnd < clock.UtcNow)).Select(u => u.Id).ToListAsync(ct);
        foreach (var id in ids)
        {
            var user = new SnapshotUser(id);
            await using var db = new AppDbContext(options, user);
            var service = new NetWorthService(
                db,
                new AccountService(db, user, accountMapper, rates),
                clock,
                user);
            await service.GetCurrentAsync(ct);
        }
    }

    private sealed record SnapshotUser(Guid Id) : ICurrentUser;
}
