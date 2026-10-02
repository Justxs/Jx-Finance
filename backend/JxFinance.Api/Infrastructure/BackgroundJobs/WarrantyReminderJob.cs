using JxFinance.Common;
using JxFinance.Common.Notifications;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class WarrantyReminderJob(
    IServiceScopeFactory scopeFactory,
    ILogger<WarrantyReminderJob> logger) : PeriodicJob(scopeFactory, logger)
{
    public const int DaysBefore = 30;

    protected override string Name => "Warranty reminder";

    protected override JobSchedule Schedule => JobSchedule.Every(TimeSpan.FromHours(6));

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var today = services.GetRequiredService<IClock>().Today;
        var last = today.AddDays(DaysBefore);
        var publisher = services.GetRequiredService<INotificationPublisher>();

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.LockAsync(AppLock.WarrantyReminders, ct);

        var due = await db.TransactionAttachments
            .IgnoreQueryFilters()
            .Where(a => !a.IsDeleted && a.WarrantyUntil >= today && a.WarrantyUntil <= last)
            .Join(
                db.Transactions.IgnoreQueryFilters().Where(t => !t.IsDeleted),
                a => a.TransactionId,
                t => t.Id,
                (a, t) => new { a.Id, a.UserId, a.FileName, a.WarrantyUntil, TransactionId = t.Id, t.Description })
            .ToListAsync(ct);
        if (due.Count == 0)
        {
            return;
        }

        var ids = due.Select(d => (Guid?)d.Id.Value).ToList();
        var sent = await db.Notifications
            .IgnoreQueryFilters()
            .Where(n => n.Type == NotificationType.WarrantyExpiring && ids.Contains(n.RelatedId))
            .Select(n => new { n.RelatedId, n.Payload })
            .ToListAsync(ct);
        var fresh = due.Where(d => !sent.Any(n => n.RelatedId == d.Id.Value && n.Payload?.DueDate == d.WarrantyUntil)).ToList();

        await publisher.PreloadAsync(fresh.Select(d => d.UserId).Distinct().ToList(), ct);
        foreach (var attachment in fresh)
        {
            publisher.Publish(new Notification
            {
                UserId = attachment.UserId,
                Type = NotificationType.WarrantyExpiring,
                Title = attachment.Description ?? attachment.FileName,
                Payload = new NotificationPayload { DueDate = attachment.WarrantyUntil, TransactionId = attachment.TransactionId.Value },
                RelatedType = NotificationRelated.Attachment,
                RelatedId = attachment.Id.Value,
                Channel = NotificationChannel.InApp,
            });
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
