using JxFinance.Common;
using JxFinance.Common.Email;
using JxFinance.Domain.Common;
using JxFinance.Domain.Email;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class EmailOutboxJob(
    IServiceScopeFactory scopeFactory,
    IOptions<AppOptions> options,
    ILogger<EmailOutboxJob> logger) : PeriodicJob(scopeFactory, logger)
{
    protected override string Name => "Email outbox drain";

    protected override TimeSpan Interval =>
        TimeSpan.FromSeconds(Math.Max(options.Value.Email.OutboxIntervalSeconds, 5));

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var delivery = services.GetRequiredService<IEmailDelivery>();
        var db = services.GetRequiredService<AppDbContext>();
        var clock = services.GetRequiredService<IClock>();
        await PruneAsync(db, clock, ct);
        if (!delivery.IsConfigured)
        {
            return;
        }

        var now = clock.UtcNow;
        var batchSize = Math.Max(options.Value.Email.OutboxBatchSize, 1);
        List<EmailMessage> due;
        await using (var transaction = await db.Database.BeginTransactionAsync(ct))
        {
            await db.Database.LockAsync(AppLock.EmailOutbox, ct);
            due = await db.EmailMessages
                .Where(m => m.SentAt == null && m.Attempts < EmailMessage.MaxAttempts && m.NextAttemptAt <= now)
                .OrderBy(m => m.CreatedAt)
                .Take(batchSize)
                .ToListAsync(ct);
            foreach (var message in due)
            {
                message.Attempts++;
                message.NextAttemptAt = Backoff(now, message.Attempts);
            }

            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }

        foreach (var message in due)
        {
            try
            {
                var result = await delivery.SendAsync(
                    new OutgoingEmail(message.ToAddress, message.ToName, message.Subject, message.Body),
                    ct);
                if (result.IsSuccess)
                {
                    message.SentAt = clock.UtcNow;
                    message.LastError = null;
                }
                else
                {
                    message.LastError = result.ErrorMessage;
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                message.LastError = ex.Message;
                logger.LogError(ex, "Sending the {Kind} email {MessageId} failed.", message.Kind, message.Id);
            }

            if (message.IsGivenUp)
            {
                logger.LogWarning(
                    "The {Kind} email {MessageId} was given up after {Attempts} attempts: {Error}",
                    message.Kind,
                    message.Id,
                    message.Attempts,
                    message.LastError);
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private static DateTimeOffset Backoff(DateTimeOffset now, int attempts) =>
        now.AddMinutes(Math.Min(Math.Pow(4, attempts), 240));

    private async Task PruneAsync(AppDbContext db, IClock clock, CancellationToken ct)
    {
        var cutoff = clock.UtcNow.AddDays(-Math.Max(options.Value.Email.KeepSentDays, 1));
        await db.EmailMessages
            .Where(m => (m.SentAt != null && m.SentAt < cutoff)
                || (m.Attempts >= EmailMessage.MaxAttempts && m.CreatedAt < cutoff))
            .ExecuteDeleteAsync(ct);
    }
}
