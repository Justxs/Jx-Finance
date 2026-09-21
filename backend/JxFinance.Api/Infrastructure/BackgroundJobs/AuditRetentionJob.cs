using JxFinance.Domain.Audit;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class AuditRetentionJob(IServiceScopeFactory scopes, ILogger<AuditRetentionJob> logger)
    : PeriodicJob(scopes, logger)
{
    protected override string Name => "Audit log retention";

    protected override TimeSpan Interval => TimeSpan.FromHours(24);

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var cutoff = AuditEvent.RetentionStart(services.GetRequiredService<IClock>().UtcNow);
        var pruned = await db.AuditEvents.Where(e => e.OccurredAt < cutoff).ExecuteDeleteAsync(ct);
        if (pruned > 0)
        {
            Logger.LogInformation(
                "Pruned {Count} audit events older than {Days} days.",
                pruned,
                AuditEvent.RetentionDays);
        }
    }
}
