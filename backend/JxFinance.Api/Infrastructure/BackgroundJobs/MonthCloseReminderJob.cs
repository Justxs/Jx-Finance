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
    protected override string Name => "Month-end close reminder";

    protected override TimeSpan Interval => TimeSpan.FromHours(1);

    protected override Feature? RequiredFeature => Feature.MonthClose;

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        if (ClosingMonth.On(clock.Today) is not (var month, _))
        {
            return;
        }

        var db = services.GetRequiredService<AppDbContext>();
        var publisher = services.GetRequiredService<INotificationPublisher>();
        var store = services.GetRequiredService<IInstanceSettingsStore>();
        var stamping = services.GetRequiredService<IClock>();
        var stamped = stamping.StartOfDay(DateWindow.MonthOf(stamping.Today).Start);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.LockAsync(AppLock.MonthCloseReminders, ct);

        var closes = db.MonthCloses.IgnoreQueryFilters(QueryFilters.OwnerOnly);
        var reminders = db.Notifications.IgnoreQueryFilters()
            .Where(n => n.Type == NotificationType.MonthReadyToClose && n.CreatedAt >= stamped);

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
                Payload = new NotificationPayload { Month = month },
                Channel = NotificationChannel.InApp,
            });
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
