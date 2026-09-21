using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Domain.Email;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace JxFinance.Common.Email;

[RegisterService<IEmailOutbox>(LifeTime.Scoped)]
public sealed class EmailOutbox(
    AppDbContext db,
    IEmailDelivery delivery,
    IClock clock,
    ILogger<EmailOutbox> logger) : IEmailOutbox
{
    public bool Enqueue(EmailKind kind, OutgoingEmail email, string? dedupeKey = null)
    {
        if (!delivery.IsConfigured || string.IsNullOrWhiteSpace(email.ToAddress))
        {
            return false;
        }

        var now = clock.UtcNow;
        db.EmailMessages.Add(new EmailMessage
        {
            Kind = kind,
            ToAddress = Clip(email.ToAddress, EmailMessage.AddressMaxLength),
            ToName = Clip(email.ToName, EmailMessage.NameMaxLength),
            Subject = Clip(email.Subject, EmailMessage.SubjectMaxLength),
            Body = Clip(email.Body, EmailMessage.BodyMaxLength),
            DedupeKey = dedupeKey is null ? null : Clip(dedupeKey, EmailMessage.DedupeKeyMaxLength),
            CreatedAt = now,
            NextAttemptAt = now,
        });
        return true;
    }

    public async Task<bool> EnqueueAndSaveAsync(
        EmailKind kind,
        OutgoingEmail email,
        CancellationToken cancellationToken,
        string? dedupeKey = null)
    {
        if (!Enqueue(kind, email, dedupeKey))
        {
            return false;
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException ex) when (IsDuplicate(ex))
        {
            db.ChangeTracker.Clear();
            logger.LogDebug("A {Kind} email with the same deduplication key was already queued.", kind);
            return false;
        }
    }

    private static bool IsDuplicate(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            TableName: "EmailMessages",
        };

    private static string Clip(string value, int maximum) =>
        value.Length <= maximum ? value : value[..maximum];
}
