using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Investments.Services;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class BrokerSyncJob(IServiceScopeFactory scopes, ILogger<BrokerSyncJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(24));
        do
        {
            try { await RunOnceAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogError(ex, "Broker sync failed."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    public async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var services = scope.ServiceProvider;
        if (!services.GetRequiredService<IInstanceSettingsStore>().Current.IsEnabled(Feature.Investments))
        {
            return;
        }

        var source = services.GetRequiredService<AppDbContext>();
        var now = services.GetRequiredService<IClock>().UtcNow;
        var connections = await source.BrokerConnections
            .IgnoreQueryFilters()
            .Where(c => !c.IsDeleted && c.IsEnabled
                && source.Accounts.IgnoreQueryFilters().Any(a => a.Id == c.AccountId && !a.IsDeleted)
                && source.Users.Any(u => u.Id == c.UserId && u.PasswordHash != null && (u.LockoutEnd == null || u.LockoutEnd < now)))
            .Select(c => new { c.UserId, c.AccountId })
            .ToListAsync(ct);
        var options = services.GetRequiredService<DbContextOptions<AppDbContext>>();

        foreach (var connection in connections)
        {
            try
            {
                var user = new SyncUser(connection.UserId);
                await using var db = new AppDbContext(options, user);
                var importer = ActivatorUtilities.CreateInstance<BrokerImportService>(services, db, user);
                var result = await importer.SyncAsync(connection.AccountId.Value, ct);
                if (result.IsFailure)
                {
                    logger.LogWarning("Broker sync for account {AccountId} failed: {Error}", connection.AccountId, result.ErrorMessage);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Broker sync for account {AccountId} failed.", connection.AccountId);
            }
        }
    }

    private sealed record SyncUser(Guid Id) : ICurrentUser;
}
