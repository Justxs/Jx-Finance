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
        TimeSpan.FromSeconds(options.Value.Email.OutboxIntervalSeconds);

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
        var batchSize = options.Value.Email.OutboxBatchSize;
        List<EmailMessage> due;
        await using (var transaction = await db.Database.BeginTransactionAsync(ct))
        {
            await db.Database.LockAsync(AppLock.EmailOutbox, ct);
            due = await db.EmailMessages
                .Due(now)
                .OrderBy(m => m.CreatedAt)
                .Take(batchSize)
                .ToListAsync(ct);
            due.ForEach(message => message.Claim(now));

            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }

        try
        {
            foreach (var message in due)
            {
                await SendAsync(delivery, clock, message, ct);
            }
        }
        finally
        {
            await db.SaveChangesAsync(CancellationToken.None);
        }
    }

    private async Task SendAsync(IEmailDelivery delivery, IClock clock, EmailMessage message, CancellationToken ct)
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
                message.LastError = TextLimit.Cut(result.ErrorMessage!, OutboxMessage.ErrorMaxLength);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            message.LastError = TextLimit.Cut(ex.Message, OutboxMessage.ErrorMaxLength);
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

    private async Task PruneAsync(AppDbContext db, IClock clock, CancellationToken ct)
    {
        var cutoff = clock.UtcNow.AddDays(-options.Value.Email.KeepSentDays);
        await db.EmailMessages
            .Where(m => (m.SentAt != null && m.SentAt < cutoff)
                || (m.Attempts >= OutboxMessage.MaxAttempts && m.CreatedAt < cutoff))
            .ExecuteDeleteAsync(ct);
    }
}
