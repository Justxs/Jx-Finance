using JxFinance.Domain.Audit;
using JxFinance.Domain.Common;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.Data;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class RetentionJob(IServiceScopeFactory scopes, ILogger<RetentionJob> logger)
    : PeriodicJob(scopes, logger)
{
    protected override string Name => "Retention";

    protected override TimeSpan Interval => TimeSpan.FromHours(24);

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var files = services.GetRequiredService<AttachmentStore>();
        var now = services.GetRequiredService<IClock>().UtcNow;

        var events = await Retention.PruneAuditEventsAsync(db, now, ct);
        if (events > 0)
        {
            Logger.LogInformation(
                "Pruned {Count} audit events older than {Days} days.",
                events,
                AuditEvent.RetentionDays);
        }

        var sessions = await Retention.PruneSessionsAsync(db, now, ct);
        if (sessions > 0)
        {
            Logger.LogInformation("Deleted {Count} expired or revoked sessions.", sessions);
        }

        var records = await Retention.PurgeDeletedAsync(db, files, now, ct);
        if (records > 0)
        {
            Logger.LogInformation(
                "Purged {Count} records deleted more than {Days} days ago.",
                records,
                DeletionEntry.RetentionDays);
        }

        var entries = await Retention.PruneDeletionEntriesAsync(db, now, ct);
        if (entries > 0)
        {
            Logger.LogInformation(
                "Pruned {Count} trash entries older than {Days} days.",
                entries,
                DeletionEntry.RetentionDays);
        }
    }
}
