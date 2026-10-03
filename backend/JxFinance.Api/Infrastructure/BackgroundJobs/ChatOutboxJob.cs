using System.Linq.Expressions;
using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public abstract class ChatOutboxJob<TMessage>(
    IServiceScopeFactory scopeFactory,
    ILogger logger) : PeriodicJob(scopeFactory, logger)
    where TMessage : OutboxMessage, IChatMessage
{
    public const int KeepDays = 7;
    public const int BatchSize = 5;

    protected override JobSchedule Schedule => JobSchedule.Every(TimeSpan.FromSeconds(30));

    protected abstract string Channel { get; }

    protected abstract AppLock Lock { get; }

    protected abstract DbSet<TMessage> Messages(AppDbContext db);

    protected abstract bool IsEnabled(InstanceSettingsSnapshot settings);

    protected abstract bool IsActive(InstanceSettings settings);

    protected abstract Expression<Func<AppUser, ChosenKinds>> Chosen { get; }

    protected abstract Result<Func<string, CancellationToken, Task<ChatSendResult>>> Open(
        IServiceProvider services,
        InstanceSettings settings);

    protected abstract void Record(InstanceSettings settings, DateTimeOffset now, string? error, bool gone = false);

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var clock = services.GetRequiredService<IClock>();
        var settings = services.GetRequiredService<IInstanceSettingsStore>().Current;
        var cutoff = clock.UtcNow.AddDays(-KeepDays);
        await Messages(db)
            .Where(m => m.CreatedAt < cutoff)
            .ExecuteDeleteAsync(ct);
        if (!IsEnabled(settings))
        {
            return;
        }

        var now = clock.UtcNow;
        List<TMessage> due;
        await using (var transaction = await db.Database.BeginTransactionAsync(ct))
        {
            await db.Database.LockAsync(Lock, ct);
            due = await Messages(db).Due(now)
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
            .AsNoTracking()
            .Where(AppUser.IsActive)
            .Where(u => userIds.Contains(u.Id))
            .Select(Chosen)
            .ToDictionaryAsync(c => c.UserId, c => c.Types, ct);
        var channel = await db.InstanceSettings.FirstOrDefaultAsync(s => s.Id == InstanceSettings.SingletonId, ct);

        try
        {
            await SendAllAsync(services, clock, channel, due, chosen, ct);
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

    private async Task SendAllAsync(
        IServiceProvider services,
        IClock clock,
        InstanceSettings? channel,
        List<TMessage> messages,
        Dictionary<Guid, List<NotificationType>> chosen,
        CancellationToken ct)
    {
        if (channel is null || !IsActive(channel))
        {
            GiveUpAll(messages, $"There is no active {Channel} channel any more.");
            return;
        }

        var opened = Open(services, channel);
        if (!opened.TryGetValue(out var send))
        {
            GiveUpAll(messages, opened.ErrorMessage!);
            Record(channel, clock.UtcNow, opened.ErrorMessage);
            return;
        }

        for (var index = 0; index < messages.Count; index++)
        {
            var message = messages[index];
            if (!chosen.TryGetValue(message.UserId, out var types) || !types.Contains(message.NotificationType))
            {
                message.GiveUp($"This notification type is no longer sent to {Channel}.");
                continue;
            }

            ChatSendResult result;
            try
            {
                result = await send(message.Content, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Sending the {Channel} message {MessageId} failed.", Channel, message.Id);
                message.LastError = TextLimit.Cut(ex.Message, OutboxMessage.ErrorMaxLength);
                Record(channel, clock.UtcNow, message.LastError);
                LogIfGivenUp(message);
                continue;
            }

            var now = clock.UtcNow;
            if (result.Error is not { } error)
            {
                message.SentAt = now;
                message.LastError = null;
                Record(channel, now, null);
                continue;
            }

            if (result.RetryAfter is { } retryAfter)
            {
                foreach (var waiting in messages.Skip(index))
                {
                    waiting.Attempts--;
                    waiting.NextAttemptAt = now + retryAfter;
                }

                return;
            }

            Record(channel, now, error.Message, result.Gone);
            if (result.Gone)
            {
                GiveUpAll(messages.Skip(index), error.Message);
                return;
            }

            message.LastError = error.Message;
            LogIfGivenUp(message);
        }
    }

    private void LogIfGivenUp(TMessage message)
    {
        if (message.IsGivenUp)
        {
            Logger.LogWarning(
                "The {Channel} message {MessageId} was given up after {Attempts} attempts: {Error}",
                Channel,
                message.Id,
                message.Attempts,
                message.LastError);
        }
    }

    private static void GiveUpAll(IEnumerable<TMessage> messages, string reason)
    {
        foreach (var message in messages)
        {
            message.GiveUp(reason);
        }
    }
}
