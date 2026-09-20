using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class ExchangeRateSyncJob(IServiceScopeFactory scopes, ILogger<ExchangeRateSyncJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(6));
        do
        {
            try { await RunOnceAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogError(ex, "Exchange rate sync failed."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    public async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var rates = scope.ServiceProvider.GetRequiredService<IExchangeRateService>();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();
        scope.ServiceProvider.GetRequiredService<ExchangeRateFetchLog>().Prune(clock.UtcNow);
        var added = await rates.SyncAsync(force: false, ct);
        if (added > 0)
        {
            logger.LogInformation("Stored {Count} exchange rates.", added);
        }
    }
}
