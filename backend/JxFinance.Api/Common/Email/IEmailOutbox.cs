using JxFinance.Domain.Email;

namespace JxFinance.Common.Email;

public interface IEmailOutbox
{
    bool Enqueue(EmailKind kind, OutgoingEmail email, string? dedupeKey = null);

    Task<bool> EnqueueAndSaveAsync(
        EmailKind kind,
        OutgoingEmail email,
        CancellationToken cancellationToken,
        string? dedupeKey = null);
}
