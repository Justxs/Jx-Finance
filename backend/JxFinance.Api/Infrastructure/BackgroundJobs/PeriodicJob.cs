using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;

namespace JxFinance.Infrastructure.BackgroundJobs;

public abstract class PeriodicJob(IServiceScopeFactory scopes, ILogger logger) : BackgroundService
{
    protected abstract string Name { get; }

    protected abstract TimeSpan Interval { get; }

    protected virtual Feature? RequiredFeature => null;

    protected ILogger Logger => logger;

    protected abstract Task RunAsync(IServiceProvider services, CancellationToken ct);

    public async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var services = scope.ServiceProvider;
        if (RequiredFeature is { } feature
            && !services.GetRequiredService<IInstanceSettingsStore>().Current.IsEnabled(feature))
        {
            return;
        }

        await RunAsync(services, ct);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "{Job} failed.", Name);
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
