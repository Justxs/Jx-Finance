using JxFinance.Domain.Audit;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Receipts;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

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

        var notifications = await Retention.PruneReadNotificationsAsync(db, now, ct);
        if (notifications > 0)
        {
            Logger.LogInformation(
                "Pruned {Count} read notifications older than {Days} days.",
                notifications,
                Notification.ReadRetentionDays);
        }

        var sessions = await Retention.PruneSessionsAsync(db, now, ct);
        if (sessions > 0)
        {
            Logger.LogInformation("Deleted {Count} expired or revoked sessions.", sessions);
        }

        var tokens = await Retention.PruneApiTokensAsync(db, now, ct);
        if (tokens > 0)
        {
            Logger.LogInformation("Deleted {Count} personal API tokens that expired more than 30 days ago.", tokens);
        }

        var records = await Retention.PurgeDeletedAsync(db, files, now, ct);
        if (records > 0)
        {
            Logger.LogInformation(
                "Purged {Count} records deleted more than {Days} days ago.",
                records,
                DeletionEntry.RetentionDays);
        }

        var cutoff = DeletionEntry.WindowStart(now);

        var expired = await Retention.DeleteAttachmentsAsync(
            db,
            files,
            db.TransactionAttachments
                .IgnoreQueryFilters()
                .Where(a => (a.IsDeleted && a.UpdatedAt < cutoff)
                    || db.Transactions.IgnoreQueryFilters().Any(t => t.Id == a.TransactionId && t.IsDeleted && t.UpdatedAt < cutoff)),
            ct);
        if (expired > 0)
        {
            Logger.LogInformation(
                "Purged {Count} attachments deleted more than {Days} days ago.",
                expired,
                DeletionEntry.RetentionDays);
        }

        var known = (await db.TransactionAttachments
            .IgnoreQueryFilters()
            .Select(a => a.Id)
            .ToListAsync(ct))
            .Select(id => id.Value)
            .ToHashSet();
        var orphans = files.RemoveOrphans(known);
        if (orphans > 0)
        {
            Logger.LogInformation("Removed {Count} attachment files that no row refers to.", orphans);
        }

        var readingCutoff = now - ReceiptReading.UnattachedLifetime;
        var readings = await Retention.PurgeAsync(
            db.ReceiptReadings
                .IgnoreQueryFilters()
                .Where(r => r.CreatedAt < readingCutoff
                    && (r.Status != ReceiptReadingStatus.Read
                        || !db.TransactionAttachments.IgnoreQueryFilters().Any(a => a.Sha256 == r.Sha256))),
            ct);
        if (readings > 0)
        {
            Logger.LogInformation("Removed {Count} receipt readings whose file is gone or whose read failed.", readings);
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
