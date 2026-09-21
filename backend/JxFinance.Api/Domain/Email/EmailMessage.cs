namespace JxFinance.Domain.Email;

public sealed class EmailMessage
{
    public const int MaxAttempts = 5;
    public const int AddressMaxLength = 320;
    public const int NameMaxLength = 200;
    public const int SubjectMaxLength = 200;
    public const int BodyMaxLength = 4000;
    public const int DedupeKeyMaxLength = 200;
    public const int ErrorMaxLength = 500;

    public Guid Id { get; set; } = Guid.NewGuid();
    public EmailKind Kind { get; set; }
    public string ToAddress { get; set; } = string.Empty;
    public string ToName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? DedupeKey { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset NextAttemptAt { get; set; }
    public DateTimeOffset? SentAt { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }

    public bool IsGivenUp => SentAt is null && Attempts >= MaxAttempts;
}
