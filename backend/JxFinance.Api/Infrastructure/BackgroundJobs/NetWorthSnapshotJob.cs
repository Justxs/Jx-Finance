using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class NetWorthSnapshotJob(
    IServiceScopeFactory scopes,
    INetWorthSnapshotter snapshotter,
    ILogger<NetWorthSnapshotJob> logger) : BackgroundService
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
        var settings = scope.ServiceProvider.GetRequiredService<IInstanceSettingsStore>();
        if (!settings.Current.IsEnabled(Feature.NetWorth))
        {
            return;
        }

        var source = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ids = await source.Users.Where(u => u.PasswordHash != null &&
            (u.LockoutEnd == null || u.LockoutEnd < AppUser.DeactivatedUntil)).OrderBy(u => u.Id).Select(u => u.Id).ToListAsync(ct);
        foreach (var id in ids)
        {
            try
            {
                await snapshotter.SnapshotAsync(id, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Net worth snapshot for user {UserId} failed.", id);
            }
        }
    }
}
