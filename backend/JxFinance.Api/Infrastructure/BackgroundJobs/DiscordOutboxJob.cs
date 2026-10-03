using JxFinance.Common;
using JxFinance.Common.Discord;
using JxFinance.Common.Email;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class DiscordOutboxJob(
    IServiceScopeFactory scopeFactory,
    ILogger<DiscordOutboxJob> logger) : PeriodicJob(scopeFactory, logger)
{
    public const int KeepDays = 7;
    public const int BatchSize = 5;

    protected override string Name => "Discord outbox drain";

    protected override JobSchedule Schedule => JobSchedule.Every(TimeSpan.FromSeconds(30));

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var clock = services.GetRequiredService<IClock>();
        var settings = services.GetRequiredService<IInstanceSettingsStore>().Current;
        var cutoff = clock.UtcNow.AddDays(-KeepDays);
        await db.DiscordMessages
            .Where(m => m.CreatedAt < cutoff)
            .ExecuteDeleteAsync(ct);
        if (!settings.DiscordEnabled)
        {
            return;
        }

        var now = clock.UtcNow;
        List<DiscordMessage> due;
        await using (var transaction = await db.Database.BeginTransactionAsync(ct))
        {
            await db.Database.LockAsync(AppLock.DiscordOutbox, ct);
            due = await db.DiscordMessages.Due(now)
                .OrderBy(m => m.CreatedAt)
                .Take(BatchSize)
                .ToListAsync(ct);
            due.ForEach(message => message.Claim(now));

            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }

        if (due.Count == 0)
        {
            return;
        }

        var userIds = due.Select(m => m.UserId).Distinct().ToList();
        var chosen = await db.Users
            .Where(AppUser.IsActive)
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.DiscordNotificationTypes, ct);
        var channel = await db.InstanceSettings.FirstOrDefaultAsync(s => s.Id == InstanceSettings.SingletonId, ct);
        var sender = new Sender(
            services.GetRequiredService<IDiscordWebhookClient>(),
            services.GetRequiredService<IDataProtectionProvider>(),
            clock,
            DiscordText.Username(EmailTexts.Product(settings.InstanceName)),
            logger);

        try
        {
            await sender.SendAllAsync(channel, due, chosen, ct);
        }
        finally
        {
            await SaveOutcomesAsync(db);
        }
    }

    private static async Task SaveOutcomesAsync(AppDbContext db)
    {
        while (true)
        {
            try
            {
                await db.SaveChangesAsync(CancellationToken.None);
                return;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                foreach (var entry in ex.Entries)
                {
                    entry.State = EntityState.Detached;
                }
            }
        }
    }

    private sealed class Sender(
        IDiscordWebhookClient client,
        IDataProtectionProvider protection,
        IClock clock,
        string username,
        ILogger logger)
    {
        public async Task SendAllAsync(
            InstanceSettings? channel,
            List<DiscordMessage> messages,
            Dictionary<Guid, List<NotificationType>> chosen,
            CancellationToken ct)
        {
            if (channel is not { DiscordEnabled: true, DiscordProtectedUrl.Length: > 0, DiscordDisabledByDiscordAt: null })
            {
                GiveUpAll(messages, "There is no active Discord webhook any more.");
                return;
            }

            var target = DiscordWebhookSecret.Read(protection, channel.DiscordProtectedUrl);
            if (!target.TryGetValue(out var destination))
            {
                GiveUpAll(messages, target.ErrorMessage!);
                channel.DiscordLastError = target.ErrorMessage;
                return;
            }

            for (var index = 0; index < messages.Count; index++)
            {
                var message = messages[index];
                if (!chosen.TryGetValue(message.UserId, out var types) || !types.Contains(message.NotificationType))
                {
                    message.GiveUp("This notification type is no longer sent to Discord.");
                    continue;
                }

                DiscordSendResult result;
                try
                {
                    result = await client.SendAsync(destination, new DiscordPost(message.Content, username), ct);
                }
                catch (OperationCanceledException) when (ct.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Sending the Discord message {MessageId} failed.", message.Id);
                    message.LastError = TextLimit.Cut(ex.Message, OutboxMessage.ErrorMaxLength);
                    channel.RecordDiscordSend(clock.UtcNow, message.LastError);
                    LogIfGivenUp(message);
                    continue;
                }

                var now = clock.UtcNow;
                if (result.Error is not { } error)
                {
                    message.SentAt = now;
                    message.LastError = null;
                    channel.RecordDiscordSend(now, null);
                    continue;
                }

                if (error.Code == ErrorCodes.DiscordRateLimited)
                {
                    foreach (var waiting in messages.Skip(index))
                    {
                        waiting.Attempts--;
                        waiting.NextAttemptAt = now + result.RetryAfter.GetValueOrDefault();
                    }

                    return;
                }

                var gone = error.Code == ErrorCodes.DiscordWebhookGone;
                channel.RecordDiscordSend(now, error.Message, gone);
                if (gone)
                {
                    GiveUpAll(messages.Skip(index), error.Message);
                    return;
                }

                message.LastError = error.Message;
                LogIfGivenUp(message);
            }
        }

        private void LogIfGivenUp(DiscordMessage message)
        {
            if (message.IsGivenUp)
            {
                logger.LogWarning(
                    "The Discord message {MessageId} was given up after {Attempts} attempts: {Error}",
                    message.Id,
                    message.Attempts,
                    message.LastError);
            }
        }

        private static void GiveUpAll(IEnumerable<DiscordMessage> messages, string reason)
        {
            foreach (var message in messages)
            {
                message.GiveUp(reason);
            }
        }
    }
}
