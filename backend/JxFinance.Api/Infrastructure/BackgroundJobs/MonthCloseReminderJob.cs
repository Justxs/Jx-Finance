using System.Globalization;
using JxFinance.Common;
using JxFinance.Common.Notifications;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class MonthCloseReminderJob(
    IServiceScopeFactory scopeFactory,
    IClock clock,
    ILogger<MonthCloseReminderJob> logger) : PeriodicJob(scopeFactory, logger)
{
    public const int LastReminderDay = 5;

    protected override string Name => "Month-end close reminder";

    protected override TimeSpan Interval => TimeSpan.FromHours(1);

    protected override Feature? RequiredFeature => Feature.MonthClose;

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var today = clock.Today;
        if (today.Day > LastReminderDay)
        {
            return;
        }

        var db = services.GetRequiredService<AppDbContext>();
        var publisher = services.GetRequiredService<INotificationPublisher>();
        var store = services.GetRequiredService<IInstanceSettingsStore>();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.LockAsync(AppLock.MonthCloseReminders, ct);

        var month = DateWindow.MonthOf(today).Start.AddMonths(-1);
        var monthText = month.ToString(NotificationTexts.MonthFormat, CultureInfo.InvariantCulture);
        var closes = db.MonthCloses.IgnoreQueryFilters(QueryFilters.OwnerOnly);
        var reminders = db.Notifications.IgnoreQueryFilters()
            .Where(n => n.Type == NotificationType.MonthReadyToClose && n.Message == monthText);

        var due = await db.Users
            .Where(AppUser.IsActive)
            .Where(u => closes.Any(c => c.UserId == u.Id)
                && !closes.Any(c => c.UserId == u.Id && c.Month == month)
                && !reminders.Any(n => n.UserId == u.Id))
            .Select(u => u.Id)
            .ToListAsync(ct);
        if (due.Count == 0)
        {
            return;
        }

        var language = store.Current.DefaultLanguage;
        await publisher.PreloadAsync(due, ct);
        foreach (var userId in due)
        {
            publisher.Publish(new Notification
            {
                UserId = userId,
                Type = NotificationType.MonthReadyToClose,
                Title = NotificationTexts.MonthTitle(language, month),
                Message = monthText,
                Payload = new NotificationPayload { Month = month },
                Channel = NotificationChannel.InApp,
            });
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
