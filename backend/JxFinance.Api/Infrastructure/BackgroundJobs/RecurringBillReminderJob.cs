using System.Globalization;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class RecurringBillReminderJob(
    IServiceScopeFactory scopeFactory,
    ILogger<RecurringBillReminderJob> logger) : BackgroundService
{
    private const string RelatedType = "RecurringBill";
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(15);

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
                break;
            }
        }
    }

    public async Task ScanAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        if (!scope.ServiceProvider.GetRequiredService<IInstanceSettingsStore>().Current.IsEnabled(Feature.RecurringBills))
        {
            return;
        }

        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(738192435)", cancellationToken);

        var today = clock.Today;
        var todayStartUtc = clock.StartOfDay(today);

        var dueBills = await db.RecurringBills
            .IgnoreQueryFilters()
            .Where(b => !b.IsDeleted && b.IsActive && b.NextDueDate <= today.AddDays(b.RemindDaysBefore))
            .ToListAsync(cancellationToken);
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
                Title = bill.Name,
                Message = bill.NextDueDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                RelatedType = RelatedType,
                RelatedId = bill.Id.Value,
                Channel = NotificationChannel.InApp,
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

}
