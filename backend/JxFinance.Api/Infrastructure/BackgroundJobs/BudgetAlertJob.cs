using JxFinance.Common;
using JxFinance.Common.Notifications;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class BudgetAlertJob(
    IServiceScopeFactory scopeFactory,
    ILogger<BudgetAlertJob> logger) : PeriodicJob(scopeFactory, logger)
{
    private static readonly (int Percent, NotificationType Type)[] Thresholds =
    [
        (80, NotificationType.BudgetWarning),
        (100, NotificationType.BudgetExceeded),
    ];

    protected override string Name => "Budget alert scan";

    protected override TimeSpan Interval => TimeSpan.FromHours(1);

    protected override Feature? RequiredFeature => Feature.Budgets;

    protected override Task RunAsync(IServiceProvider services, CancellationToken ct) =>
        ForEachActiveUserAsync(services, userId => ScanUserAsync(userId, ct), ct);

    private async Task ScanUserAsync(Guid userId, CancellationToken ct)
    {
        await using var scope = UserScope(userId);
        var services = scope.ServiceProvider;
        var clock = services.GetRequiredService<IClock>();
        var db = services.GetRequiredService<AppDbContext>();

        var budgets = await db.Budgets.ToListAsync(ct);
        if (budgets.Count == 0)
        {
            return;
        }

        var usage = await services.GetRequiredService<IBudgetUsageCalculator>().CalculateAsync(budgets, clock.Today, ct);
        var categories = await db.Categories.ToDictionaryAsync(c => c.Id, c => c.Name, ct);
        var publisher = services.GetRequiredService<INotificationPublisher>();

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.LockAsync(AppLock.BudgetAlerts, ct);

        var since = clock.StartOfDay(usage.Values.Min(u => u.Window.Start));
        var sent = await db.Notifications
            .Where(n => n.RelatedType == NotificationRelated.Budget && n.CreatedAt >= since)
            .Select(n => new { n.Type, n.RelatedId, n.CreatedAt })
            .ToListAsync(ct);
        await publisher.PreloadAsync([userId], ct);

        foreach (var budget in budgets)
        {
            var window = usage[budget.Id];
            var windowStart = clock.StartOfDay(window.Window.Start);
            var effectiveLimit = budget.LimitAmount.Amount + window.Carried;

            foreach (var (percent, type) in Thresholds)
            {
                if (!Reached(window.Spent, effectiveLimit, percent)
                    || sent.Any(n => n.Type == type && n.RelatedId == budget.Id.Value && n.CreatedAt >= windowStart))
                {
                    continue;
                }

                publisher.Publish(new Notification
                {
                    UserId = userId,
                    Type = type,
                    Title = categories.GetValueOrDefault(budget.CategoryId) ?? "Unknown",
                    Payload = new NotificationPayload { ThresholdPercent = percent, Period = budget.Period },
                    RelatedType = NotificationRelated.Budget,
                    RelatedId = budget.Id.Value,
                    Channel = NotificationChannel.InApp,
                });
            }
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    private static bool Reached(decimal spent, decimal effectiveLimit, int percent) =>
        effectiveLimit > 0m ? spent * 100m >= effectiveLimit * percent : spent > 0m;
}
