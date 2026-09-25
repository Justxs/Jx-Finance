using System.Globalization;
using JxFinance.Common;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Budgets.Services;
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

    public Task ScanAsync(CancellationToken cancellationToken) => RunOnceAsync(cancellationToken);

    protected override Task RunAsync(IServiceProvider services, CancellationToken ct) =>
        ForEachActiveUserAsync(services, userId => ScanUserAsync(services, userId, ct), ct);

    private static async Task ScanUserAsync(IServiceProvider services, Guid userId, CancellationToken ct)
    {
        var clock = services.GetRequiredService<IClock>();
        await using var db = AppDbContext.For(services, userId);

        var budgets = await db.Budgets.ToListAsync(ct);
        if (budgets.Count == 0)
        {
            return;
        }

        var calculator = ActivatorUtilities.CreateInstance<BudgetUsageCalculator>(
            services,
            new CategoryAttributionService(db));
        var usage = await calculator.CalculateAsync(budgets, ct);
        var categories = await db.Categories.ToDictionaryAsync(c => c.Id, c => c.Name, ct);

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.LockAsync(AppLock.BudgetAlerts, ct);

        var since = clock.StartOfDay(usage.Values.Min(u => u.Window.Start));
        var sent = await db.Notifications
            .Where(n => n.RelatedType == NotificationRelated.Budget && n.CreatedAt >= since)
            .Select(n => new { n.Type, n.RelatedId, n.CreatedAt })
            .ToListAsync(ct);

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

                db.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Type = type,
                    Title = categories.GetValueOrDefault(budget.CategoryId) ?? "Unknown",
                    Message = string.Create(
                        CultureInfo.InvariantCulture,
                        $"{percent}% of the {budget.Period.ToString().ToLowerInvariant()} limit"),
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
