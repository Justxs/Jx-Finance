using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class ExchangeRateSyncJob(IServiceScopeFactory scopes, ILogger<ExchangeRateSyncJob> logger)
    : PeriodicJob(scopes, logger)
{
    protected override string Name => "Exchange rate sync";

    protected override TimeSpan Interval => TimeSpan.FromHours(6);

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var rates = services.GetRequiredService<IExchangeRateService>();
        var clock = services.GetRequiredService<IClock>();
        services.GetRequiredService<ExchangeRateFetchLog>().Prune(clock.UtcNow);
        var added = await rates.SyncAsync(force: false, ct);
        if (added > 0)
        {
            Logger.LogInformation("Stored {Count} exchange rates.", added);
        }
    }
}
