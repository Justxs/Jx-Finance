using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.RecurringBills;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class RecurringBillReminderJob(
    IServiceScopeFactory scopeFactory,
    ILogger<RecurringBillReminderJob> logger) : BackgroundService
{
    private const string RelatedType = "RecurringBill";
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ScanAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Recurring bill reminder scan failed.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
            }
        }
    }

    private async Task ScanAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();

        var appNow = clock.ToAppTime(clock.UtcNow);
        var todayLocal = new DateTime(appNow.Year, appNow.Month, appNow.Day, 0, 0, 0, DateTimeKind.Unspecified);
        var today = DateOnly.FromDateTime(todayLocal);
        var todayStartUtc = new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(todayLocal, clock.TimeZone), TimeSpan.Zero);

        var activeBills = await db.RecurringBills
            .IgnoreQueryFilters()
            .Where(b => !b.IsDeleted && b.IsActive)
            .ToListAsync(cancellationToken);

        var dueBills = activeBills.Where(b => b.NextDueDate <= today.AddDays(b.RemindDaysBefore)).ToList();
        if (dueBills.Count == 0)
        {
            return;
        }

        var billIds = dueBills.Select(b => (Guid?)b.Id.Value).ToList();
        var remindedToday = await db.Notifications
            .IgnoreQueryFilters()
            .Where(n => !n.IsDeleted
                && n.RelatedType == RelatedType
                && billIds.Contains(n.RelatedId)
                && n.CreatedAt >= todayStartUtc)
            .Select(n => n.RelatedId!.Value)
            .ToListAsync(cancellationToken);
        var remindedSet = remindedToday.ToHashSet();

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
                Title = $"{bill.Name} is due",
                Message = BuildMessage(bill, today),
                RelatedType = RelatedType,
                RelatedId = bill.Id.Value,
                Channel = NotificationChannel.InApp,
            });
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static string BuildMessage(RecurringBill bill, DateOnly today) =>
        bill.NextDueDate <= today
            ? $"{bill.Name} was due on {bill.NextDueDate:yyyy-MM-dd}."
            : $"{bill.Name} is due on {bill.NextDueDate:yyyy-MM-dd}.";
}
