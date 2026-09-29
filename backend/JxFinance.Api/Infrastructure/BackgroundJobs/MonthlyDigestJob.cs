using JxFinance.Common;
using JxFinance.Common.Notifications;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.MonthCloses.Interfaces;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class MonthlyDigestJob(
    IServiceScopeFactory scopeFactory,
    IClock clock,
    ILogger<MonthlyDigestJob> logger) : PeriodicJob(scopeFactory, logger)
{
    protected override string Name => "Monthly digest";

    protected override TimeSpan Interval => TimeSpan.FromHours(1);

    protected override Feature? RequiredFeature => Feature.MonthClose;

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        if (ClosingMonth.On(clock.Today) is not (var month, var monthText))
        {
            return;
        }

        foreach (var userId in await SubscribersAsync(services, monthText, ct))
        {
            await RunAsUserAsync(userId, scoped => SendAsync(scoped, userId, month, monthText, ct));
        }
    }

    private static async Task<List<Guid>> SubscribersAsync(IServiceProvider services, string monthText, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var sent = Sent(db, monthText);
        var users = await db.Users
            .AsNoTracking()
            .Where(AppUser.IsActive)
            .Where(u => !sent.Any(n => n.UserId == u.Id))
            .OrderBy(u => u.Id)
            .Select(u => new { u.Id, u.EmailNotificationTypes })
            .ToListAsync(ct);
        var byDiscord = services.GetRequiredService<IInstanceSettingsStore>().Current.DiscordEnabled
            ? (await db.DiscordWebhooks
                .IgnoreQueryFilters(QueryFilters.OwnerOnly)
                .AsNoTracking()
                .Where(w => w.IsEnabled && w.DisabledByDiscordAt == null)
                .Select(w => new { w.UserId, w.Types })
                .ToListAsync(ct))
                .Where(w => w.Types.Contains(NotificationType.MonthlyDigest))
                .Select(w => w.UserId)
                .ToHashSet()
            : [];

        return users
            .Where(u => u.EmailNotificationTypes.Contains(NotificationType.MonthlyDigest) || byDiscord.Contains(u.Id))
            .Select(u => u.Id)
            .ToList();
    }

    private static async Task SendAsync(IServiceProvider services, Guid userId, DateOnly month, string monthText, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var publisher = services.GetRequiredService<INotificationPublisher>();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.LockAsync(AppLock.MonthlyDigest, ct);
        if (await Sent(db, monthText).AnyAsync(n => n.UserId == userId, ct))
        {
            return;
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
            Title = NotificationTexts.MonthTitle(settings.DefaultLanguage, month),
            Message = monthText,
            Payload = new NotificationPayload { Month = month, Digest = digest },
            Channel = NotificationChannel.InApp,
        });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    private static IQueryable<Notification> Sent(AppDbContext db, string monthText) =>
        db.Notifications.IgnoreQueryFilters()
            .Where(n => n.Type == NotificationType.MonthlyDigest && n.Message == monthText);
}
