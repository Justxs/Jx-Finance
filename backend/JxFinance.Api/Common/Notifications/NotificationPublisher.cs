using System.Globalization;
using FastEndpoints;
using JxFinance.Common.Email;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Email;
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
    IEmailOutbox outbox,
    IInstanceSettingsStore store,
    IClock clock,
    IOptions<AppOptions> options) : INotificationPublisher
{
    private static readonly Member Nobody = new(string.Empty, null, new HashSet<NotificationType>(), new HashSet<NotificationType>());

    private readonly Dictionary<Guid, Member> members = [];
    private readonly Dictionary<Guid, EmailRecipient> emailRecipients = [];
    private readonly HashSet<string> queuedDiscordKeys = new(StringComparer.Ordinal);
    private readonly HashSet<string> queuedTelegramKeys = new(StringComparer.Ordinal);
    private readonly HashSet<string> queuedEmailKeys = new(StringComparer.Ordinal);

    public async Task PreloadAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken)
    {
        var missing = userIds.Where(id => !members.ContainsKey(id)).Distinct().ToList();
        if (missing.Count == 0)
        {
            return;
        }

        foreach (var userId in missing)
        {
            members[userId] = Nobody;
        }

        var since = clock.StartOfDay(clock.Today);
        await PreloadUsersAsync(missing, since, cancellationToken);
        if (store.Current.DiscordEnabled)
        {
            queuedDiscordKeys.UnionWith(await db.DiscordMessages
                .Where(m => missing.Contains(m.UserId) && m.CreatedAt >= since && m.DedupeKey != null)
                .Select(m => m.DedupeKey!)
                .ToListAsync(cancellationToken));
        }

        if (store.Current.TelegramEnabled)
        {
            queuedTelegramKeys.UnionWith(await db.TelegramMessages
                .Where(m => missing.Contains(m.UserId) && m.CreatedAt >= since && m.DedupeKey != null)
                .Select(m => m.DedupeKey!)
                .ToListAsync(cancellationToken));
        }
    }

    public void Publish(Notification notification)
    {
        if (!members.TryGetValue(notification.UserId, out var member))
        {
            throw new InvalidOperationException(
                $"Call {nameof(PreloadAsync)} for the owner of a notification before publishing it.");
        }

        var language = member.Language ?? store.Current.DefaultLanguage;
        notification.Message = NotificationTexts.Sentence(language, notification);
        db.Notifications.Add(notification);

        var key = string.Create(
            CultureInfo.InvariantCulture,
            $"{notification.UserId:N}:{notification.Type}:{notification.RelatedId ?? notification.Id.Value:N}:{clock.Today:yyyy-MM-dd}");
        if (member.Discord.Contains(notification.Type) && queuedDiscordKeys.Add(key))
        {
            var now = clock.UtcNow;
            db.DiscordMessages.Add(new DiscordMessage
            {
                UserId = notification.UserId,
                NotificationType = notification.Type,
                Content = NotificationTexts.Discord(language, notification, member.Name, options.Value.SiteUrl),
                DedupeKey = key,
                CreatedAt = now,
                NextAttemptAt = now,
            });
        }

        if (member.Telegram.Contains(notification.Type) && queuedTelegramKeys.Add(key))
        {
            var now = clock.UtcNow;
            db.TelegramMessages.Add(new TelegramMessage
            {
                UserId = notification.UserId,
                NotificationType = notification.Type,
                Content = NotificationTexts.Telegram(language, notification, member.Name, options.Value.SiteUrl),
                DedupeKey = key,
                CreatedAt = now,
                NextAttemptAt = now,
            });
        }

        if (emailRecipients.TryGetValue(notification.UserId, out var recipient)
            && recipient.Types.Contains(notification.Type)
            && queuedEmailKeys.Add(key))
        {
            QueueEmail(notification, recipient, language, key);
        }
    }

    private async Task PreloadUsersAsync(List<Guid> userIds, DateTimeOffset since, CancellationToken cancellationToken)
    {
        var settings = store.Current;
        var users = await db.Users
            .AsNoTracking()
            .Where(AppUser.IsActive)
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.EmailConfirmed,
                u.DisplayName,
                u.EmailNotificationTypes,
                u.DiscordNotificationTypes,
                u.TelegramNotificationTypes,
                u.Language,
            })
            .ToListAsync(cancellationToken);
        foreach (var user in users)
        {
            members[user.Id] = new Member(
                user.DisplayName,
                user.Language,
                settings.DiscordEnabled ? user.DiscordNotificationTypes.ToHashSet() : Nobody.Discord,
                settings.TelegramEnabled ? user.TelegramNotificationTypes.ToHashSet() : Nobody.Telegram);
        }

        var recipients = users.Where(u => u.EmailConfirmed && u.Email != null && u.EmailNotificationTypes.Count > 0).ToList();
        if (recipients.Count == 0)
        {
            return;
        }

        foreach (var user in recipients)
        {
            emailRecipients[user.Id] = new EmailRecipient(user.Email!, user.DisplayName, user.EmailNotificationTypes.ToHashSet());
        }

        var queued = await db.EmailMessages
            .Where(m => (m.Kind == EmailKind.Notification || m.Kind == EmailKind.BillReminder)
                && m.CreatedAt >= since
                && m.DedupeKey != null)
            .Select(m => m.DedupeKey!)
            .ToListAsync(cancellationToken);
        queuedEmailKeys.UnionWith(queued);
    }

    private void QueueEmail(Notification notification, EmailRecipient recipient, string language, string key)
    {
        var product = EmailTexts.Product(store.Current.InstanceName);
        var (kind, email) = notification switch
        {
            { Type: NotificationType.BillDue, Payload.DueDate: { } due } => (
                EmailKind.BillReminder,
                EmailTexts.BillReminder(
                    language,
                    recipient.Address,
                    recipient.DisplayName,
                    notification.Title,
                    due,
                    notification.Payload.Shape,
                    product)),
            { Type: NotificationType.MonthlyDigest, Payload.Digest: not null } => (
                EmailKind.Notification,
                EmailTexts.MonthlyDigest(
                    language,
                    recipient.Address,
                    recipient.DisplayName,
                    notification,
                    options.Value.SiteUrl,
                    product)),
            _ => (
                EmailKind.Notification,
                EmailTexts.Notification(
                    language,
                    recipient.Address,
                    recipient.DisplayName,
                    notification,
                    options.Value.SiteUrl,
                    product)),
        };
        outbox.Enqueue(kind, email, key);
    }

    private sealed record Member(
        string Name,
        string? Language,
        IReadOnlySet<NotificationType> Discord,
        IReadOnlySet<NotificationType> Telegram);

    private sealed record EmailRecipient(string Address, string DisplayName, IReadOnlySet<NotificationType> Types);
}
