using JxFinance.Common;
using JxFinance.Common.Notifications;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class RecurringBillReminderJob(
    IServiceScopeFactory scopeFactory,
    ILogger<RecurringBillReminderJob> logger) : PeriodicJob(scopeFactory, logger)
{
    protected override string Name => "Recurring bill reminder scan";

    protected override JobSchedule Schedule => JobSchedule.Every(TimeSpan.FromMinutes(15));

    protected override Feature? RequiredFeature => Feature.RecurringBills;

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var clock = services.GetRequiredService<IClock>();
        var publisher = services.GetRequiredService<INotificationPublisher>();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.LockAsync(AppLock.RecurringBillReminders, ct);

        var today = clock.Today;
        var todayStartUtc = clock.StartOfDay(today);

        var dueBills = await db.RecurringBills
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(b => b.IsActive && b.NextDueDate <= today.AddDays(b.RemindDaysBefore))
            .ToListAsync(ct);
        if (dueBills.Count == 0)
        {
            return;
        }

        var billIds = dueBills.Select(b => (Guid?)b.Id.Value).ToList();
        var remindedToday = await db.Notifications
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(n => n.RelatedType == NotificationRelated.RecurringBill
                && billIds.Contains(n.RelatedId)
                && n.CreatedAt >= todayStartUtc)
            .Select(n => n.RelatedId!.Value)
            .ToListAsync(ct);
        var remindedSet = remindedToday.ToHashSet();

        var ownerIds = dueBills.Select(b => b.UserId).Distinct().ToList();
        await publisher.PreloadAsync(ownerIds, ct);

        foreach (var bill in dueBills)
        {
            if (remindedSet.Contains(bill.Id.Value))
            {
                continue;
            }

            publisher.Publish(new Notification
            {
                UserId = bill.UserId,
                Type = NotificationType.BillDue,
                Title = bill.Name,
                Payload = new NotificationPayload { DueDate = bill.NextDueDate, Shape = bill.Shape },
                RelatedType = NotificationRelated.RecurringBill,
                RelatedId = bill.Id.Value,
                Channel = NotificationChannel.InApp,
            });
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
