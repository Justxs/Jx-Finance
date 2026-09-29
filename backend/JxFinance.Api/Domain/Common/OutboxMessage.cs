namespace JxFinance.Domain.Common;

public abstract class OutboxMessage
{
    public const int MaxAttempts = 5;
    public const int DedupeKeyMaxLength = 200;
    public const int ErrorMaxLength = 500;

    public Guid Id { get; set; } = Guid.NewGuid();
    public string? DedupeKey { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset NextAttemptAt { get; set; }
    public DateTimeOffset? SentAt { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }

    public bool IsGivenUp => SentAt is null && Attempts >= MaxAttempts;

    public void Claim(DateTimeOffset now)
    {
        Attempts++;
        NextAttemptAt = now.AddMinutes(Math.Min(Math.Pow(4, Attempts), 240));
    }

    public void GiveUp(string error)
    {
        Attempts = MaxAttempts;
        LastError = error;
    }
}
