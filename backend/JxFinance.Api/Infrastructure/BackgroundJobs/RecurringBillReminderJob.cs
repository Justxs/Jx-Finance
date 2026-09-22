using System.Globalization;
using JxFinance.Common;
using JxFinance.Common.Email;
using JxFinance.Common.Formats;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Email;
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

    protected override TimeSpan Interval => TimeSpan.FromMinutes(15);

    protected override Feature? RequiredFeature => Feature.RecurringBills;

    public Task ScanAsync(CancellationToken cancellationToken) => RunOnceAsync(cancellationToken);

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var clock = services.GetRequiredService<IClock>();
        var outbox = services.GetRequiredService<IEmailOutbox>();
        var store = services.GetRequiredService<IInstanceSettingsStore>();
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
        var subscribers = await db.Users
            .Where(u => ownerIds.Contains(u.Id) && u.BillReminderEmails && u.EmailConfirmed && u.Email != null)
            .Select(u => new { u.Id, u.Email, u.DisplayName })
            .ToListAsync(ct);
        var byOwner = subscribers.ToDictionary(u => u.Id);
        var settings = store.Current;
        var product = EmailTexts.Product(settings.InstanceName);

        foreach (var bill in dueBills)
        {
            if (remindedSet.Contains(bill.Id.Value))
            {
                continue;
            }

            db.Notifications.Add(new Notification
            {
                UserId = bill.UserId,
                Type = NotificationType.BillDue,
                Title = bill.Name,
                Message = bill.NextDueDate.ToString(DateFormats.IsoDate, CultureInfo.InvariantCulture),
                Payload = new NotificationPayload { DueDate = bill.NextDueDate, Shape = bill.Shape },
                RelatedType = NotificationRelated.RecurringBill,
                RelatedId = bill.Id.Value,
                Channel = NotificationChannel.InApp,
            });

            if (byOwner.TryGetValue(bill.UserId, out var owner))
            {
                outbox.Enqueue(
                    EmailKind.BillReminder,
                    EmailTexts.BillReminder(
                        settings.DefaultLanguage,
                        owner.Email!,
                        owner.DisplayName,
                        bill.Name,
                        bill.NextDueDate,
                        bill.Shape,
                        product),
                    $"bill:{bill.Id.Value}:{today:yyyy-MM-dd}");
            }
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
