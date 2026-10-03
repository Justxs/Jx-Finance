using System.Globalization;
using JxFinance.Common;
using JxFinance.Common.Notifications;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Accounts.GetCashFlowForecast;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class LowBalanceJob(
    IServiceScopeFactory scopeFactory,
    ILogger<LowBalanceJob> logger) : PeriodicJob(scopeFactory, logger)
{
    public const int LookAheadDays = 30;

    protected override string Name => "Low balance forecast scan";

    protected override JobSchedule Schedule => JobSchedule.Every(TimeSpan.FromHours(6));

    protected override Feature? RequiredFeature => Feature.CashFlowForecast;

    protected override Task RunAsync(IServiceProvider services, CancellationToken ct) =>
        ForEachActiveUserAsync(services, userId => ScanUserAsync(userId, ct), ct);

    private async Task ScanUserAsync(Guid userId, CancellationToken ct)
    {
        await using var scope = UserScope(userId);
        var services = scope.ServiceProvider;
        var forecast = await services.GetRequiredService<ICashFlowForecastService>().GetAsync(LookAheadDays, null, ct);
        var atRisk = forecast.Accounts
            .Where(account => account is { BelowZeroOn: not null, StartBalance: >= 0m })
            .ToList();
        if (atRisk.Count == 0)
        {
            return;
        }

        var db = services.GetRequiredService<AppDbContext>();
        var publisher = services.GetRequiredService<INotificationPublisher>();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.LockAsync(AppLock.LowBalanceAlerts, ct);

        var accountIds = atRisk.Select(account => (Guid?)account.AccountId).ToList();
        var sent = await db.Notifications
            .Where(n => n.Type == NotificationType.LowBalance && accountIds.Contains(n.RelatedId))
            .Select(n => new { n.RelatedId, n.Payload })
            .ToListAsync(ct);
        await publisher.PreloadAsync([userId], ct);

        foreach (var account in atRisk.Where(a => !sent.Any(n => n.RelatedId == a.AccountId && n.Payload?.DueDate == a.BelowZeroOn)))
        {
            publisher.Publish(Alert(userId, account));
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    private static Notification Alert(Guid userId, AccountForecastResponse account) => new()
    {
        UserId = userId,
        Type = NotificationType.LowBalance,
        Title = account.AccountName,
        Payload = new NotificationPayload
        {
            DueDate = account.BelowZeroOn,
            Amount = account.LowestBalance.ToString("0.00", CultureInfo.InvariantCulture),
            Currency = account.Currency,
        },
        RelatedType = NotificationRelated.Account,
        RelatedId = account.AccountId,
        Channel = NotificationChannel.InApp,
    };
}
