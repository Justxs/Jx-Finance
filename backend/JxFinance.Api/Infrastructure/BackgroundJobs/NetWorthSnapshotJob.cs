using JxFinance.Domain.Settings;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class NetWorthSnapshotJob(
    IServiceScopeFactory scopes,
    INetWorthSnapshotter snapshotter,
    ILogger<NetWorthSnapshotJob> logger) : PeriodicJob(scopes, logger)
{
    protected override string Name => "Net worth snapshot";

    protected override TimeSpan Interval => TimeSpan.FromHours(1);

    protected override Feature? RequiredFeature => Feature.NetWorth;

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var source = services.GetRequiredService<AppDbContext>();
        var ids = await source.Users.Where(AppUser.IsActive).OrderBy(u => u.Id).Select(u => u.Id).ToListAsync(ct);
        foreach (var id in ids)
        {
            try
            {
                await snapshotter.SnapshotAsync(id, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                Logger.LogError(ex, "Net worth snapshot for user {UserId} failed.", id);
            }
        }
    }
}
