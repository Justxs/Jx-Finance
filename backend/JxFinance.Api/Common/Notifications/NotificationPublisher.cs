using System.Globalization;
using FastEndpoints;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JxFinance.Common.Notifications;

[RegisterService<INotificationPublisher>(LifeTime.Scoped)]
public sealed class NotificationPublisher(
    AppDbContext db,
    IInstanceSettingsStore store,
    IClock clock,
    IOptions<AppOptions> options) : INotificationPublisher
{
    private readonly Dictionary<Guid, IReadOnlySet<NotificationType>> discordTypes = [];
    private readonly HashSet<string> queuedKeys = new(StringComparer.Ordinal);

    public static INotificationPublisher For(IServiceProvider services, AppDbContext db) =>
        ActivatorUtilities.CreateInstance<NotificationPublisher>(services, db);

    public async Task PreloadAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken)
    {
        var missing = userIds.Where(id => !discordTypes.ContainsKey(id)).Distinct().ToList();
        if (missing.Count == 0)
        {
            return;
        }

        foreach (var userId in missing)
        {
            discordTypes[userId] = new HashSet<NotificationType>();
        }

        if (!store.Current.DiscordEnabled)
        {
            return;
        }

        var webhooks = await db.DiscordWebhooks
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .AsNoTracking()
            .Where(w => missing.Contains(w.UserId) && w.IsEnabled && w.DisabledByDiscordAt == null)
            .Where(w => db.Users.Where(AppUser.IsActive).Select(u => u.Id).Contains(w.UserId))
            .Select(w => new { w.UserId, w.Types })
            .ToListAsync(cancellationToken);
        foreach (var webhook in webhooks)
        {
            discordTypes[webhook.UserId] = webhook.Types.ToHashSet();
        }

        var since = clock.StartOfDay(clock.Today);
        var queued = await db.DiscordMessages
            .Where(m => missing.Contains(m.UserId) && m.CreatedAt >= since && m.DedupeKey != null)
            .Select(m => m.DedupeKey!)
            .ToListAsync(cancellationToken);
        queuedKeys.UnionWith(queued);
    }

    public void Publish(Notification notification)
    {
        if (!discordTypes.TryGetValue(notification.UserId, out var types))
        {
            throw new InvalidOperationException(
                $"Call {nameof(PreloadAsync)} for the owner of a notification before publishing it.");
        }

        db.Notifications.Add(notification);

        var key = string.Create(
            CultureInfo.InvariantCulture,
            $"{notification.UserId:N}:{notification.Type}:{notification.RelatedId ?? notification.Id.Value:N}:{clock.Today:yyyy-MM-dd}");
        if (!types.Contains(notification.Type) || !queuedKeys.Add(key))
        {
            return;
        }

        var now = clock.UtcNow;
        db.DiscordMessages.Add(new DiscordMessage
        {
            UserId = notification.UserId,
            NotificationType = notification.Type,
            Content = NotificationTexts.Discord(store.Current.DefaultLanguage, notification, options.Value.SiteUrl),
            DedupeKey = key,
            CreatedAt = now,
            NextAttemptAt = now,
        });
    }
}
