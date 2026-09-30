using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Investments.Interfaces;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class PriceSyncJob(IServiceScopeFactory scopes, ILogger<PriceSyncJob> logger) : PeriodicJob(scopes, logger)
{
    protected override string Name => "Price sync";

    protected override TimeSpan Interval => TimeSpan.FromHours(6);

    protected override Feature? RequiredFeature => Feature.Investments;

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        if (!services.GetRequiredService<IInstanceSettingsStore>().Current.PriceSyncEnabled)
        {
            return;
        }

        var result = await services.GetRequiredService<IPriceSyncService>().SyncAsync(force: false, ct);
        if (result.Value is { Written: > 0 } synced)
        {
            Logger.LogInformation("Stored {Count} security prices.", synced.Written);
        }
    }
}
