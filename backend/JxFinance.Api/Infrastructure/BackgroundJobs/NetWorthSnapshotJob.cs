using JxFinance.Domain.Settings;
using JxFinance.Endpoints.NetWorth.Interfaces;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class NetWorthSnapshotJob(
    IServiceScopeFactory scopes,
    INetWorthSnapshotter snapshotter,
    ILogger<NetWorthSnapshotJob> logger) : PeriodicJob(scopes, logger)
{
    protected override string Name => "Net worth snapshot";

    protected override TimeSpan Interval => TimeSpan.FromHours(1);

    protected override Feature? RequiredFeature => Feature.NetWorth;

    protected override Task RunAsync(IServiceProvider services, CancellationToken ct) =>
        ForEachActiveUserAsync(services, userId => snapshotter.SnapshotAsync(userId, ct), ct);
}
