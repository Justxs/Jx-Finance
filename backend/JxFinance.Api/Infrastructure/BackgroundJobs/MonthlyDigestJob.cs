using JxFinance.Common;
using JxFinance.Common.Notifications;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.MonthCloses.Interfaces;
using JxFinance.Endpoints.MonthCloses.Shared;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class MonthlyDigestJob(
    IServiceScopeFactory scopeFactory,
    IClock clock,
    ILogger<MonthlyDigestJob> logger) : PeriodicJob(scopeFactory, logger)
{
    private const string HouseholdRelatedType = "Household";

    protected override string Name => "Monthly digest";

    protected override JobSchedule Schedule => JobSchedule.Cron("0 8 * * *");

    protected override Feature? RequiredFeature => Feature.MonthClose;

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        if (ClosingMonth.On(clock.Today) is not (var month, var monthText))
        {
            return;
        }

        foreach (var (userId, household) in await DueAsync(services, ct))
        {
            await RunAsUserAsync(
                userId,
                scoped => SendAsync(scoped, userId, household, month, monthText, ct),
                household is { } id ? new HouseholdId(id) : null);
        }
    }

    private static async Task<List<(Guid UserId, Guid? Household)>> DueAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var settings = services.GetRequiredService<IInstanceSettingsStore>().Current;
        var users = await db.Users
            .AsNoTracking()
            .Where(AppUser.IsActive)
            .OrderBy(u => u.Id)
            .Select(u => new { u.Id, u.EmailNotificationTypes, u.DiscordNotificationTypes, u.MonthlyDigestEverything, u.MonthlyDigestHouseholdIds })
            .ToListAsync(ct);
        var sent = (await Sent(services).Select(n => new { n.UserId, n.RelatedId }).ToListAsync(ct))
            .Select(n => (n.UserId, n.RelatedId))
            .ToHashSet();
        var households = settings.IsEnabled(Feature.Households);

        return users
            .Where(u => u.EmailNotificationTypes.Contains(NotificationType.MonthlyDigest)
                || (settings.DiscordEnabled && u.DiscordNotificationTypes.Contains(NotificationType.MonthlyDigest)))
            .SelectMany(u => (u.MonthlyDigestEverything ? [(Guid?)null] : Array.Empty<Guid?>())
                .Concat(households ? u.MonthlyDigestHouseholdIds.Select(id => (Guid?)id) : [])
                .Select(household => (u.Id, household)))
            .Where(scope => !sent.Contains(scope))
            .ToList();
    }

    private static async Task SendAsync(
        IServiceProvider services,
        Guid userId,
        Guid? household,
        DateOnly month,
        string monthText,
        CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var publisher = services.GetRequiredService<INotificationPublisher>();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.LockAsync(AppLock.MonthlyDigest, ct);
        if (await Sent(services).AnyAsync(n => n.UserId == userId && n.RelatedId == household, ct))
        {
            return;
        }

        string? householdName = null;
        if (household is { } id)
        {
            var householdId = new HouseholdId(id);
            householdName = await db.Households.Where(h => h.Id == householdId).Select(h => h.Name).FirstOrDefaultAsync(ct);
            if (householdName is null)
            {
                return;
            }
        }

        var review = await services.GetRequiredService<IMonthCloseService>().GetMonthAsync(monthText, ct);
        var settings = services.GetRequiredService<IInstanceSettingsStore>().Current;
        if (!review.TryGetValue(out var value) || MonthlyDigest.From(value, settings.ReportingCurrency) is not { } digest)
        {
            return;
        }

        await publisher.PreloadAsync([userId], ct);
        publisher.Publish(new Notification
        {
            UserId = userId,
            Type = NotificationType.MonthlyDigest,
            Title = NotificationTexts.DigestTitle(settings.DefaultLanguage, month, householdName),
            Payload = new NotificationPayload { Month = month, Digest = digest, Household = householdName },
            RelatedType = household is null ? null : HouseholdRelatedType,
            RelatedId = household,
            Channel = NotificationChannel.InApp,
        });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    private static IQueryable<Notification> Sent(IServiceProvider services)
    {
        var clock = services.GetRequiredService<IClock>();
        var since = clock.StartOfDay(DateWindow.MonthOf(clock.Today).Start);
        return services.GetRequiredService<AppDbContext>().Notifications.IgnoreQueryFilters()
            .Where(n => n.Type == NotificationType.MonthlyDigest && n.CreatedAt >= since);
    }
}
