using JxFinance.Domain.Common;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class AttachmentPurgeJob(IServiceScopeFactory scopes, ILogger<AttachmentPurgeJob> logger)
    : PeriodicJob(scopes, logger)
{
    protected override string Name => "Attachment purge";

    protected override TimeSpan Interval => TimeSpan.FromHours(24);

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var files = services.GetRequiredService<AttachmentStore>();
        var cutoff = DeletionEntry.WindowStart(services.GetRequiredService<IClock>().UtcNow);

        var expired = await db.TransactionAttachments
            .IgnoreQueryFilters()
            .Where(a => (a.IsDeleted && a.UpdatedAt < cutoff)
                || db.Transactions.IgnoreQueryFilters().Any(t => t.Id == a.TransactionId && t.IsDeleted && t.UpdatedAt < cutoff))
            .Select(a => a.Id)
            .ToListAsync(ct);

        if (expired.Count > 0)
        {
            await db.TransactionAttachments
                .IgnoreQueryFilters()
                .Where(a => expired.Contains(a.Id))
                .ExecuteDeleteAsync(ct);
            foreach (var id in expired)
            {
                files.Delete(id.Value);
            }

            Logger.LogInformation(
                "Purged {Count} attachments deleted more than {Days} days ago.",
                expired.Count,
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
    }
}
