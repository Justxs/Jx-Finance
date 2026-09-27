namespace JxFinance.Domain.Notifications;

public sealed class DiscordMessage
{
    public const int MaxAttempts = 5;
    public const int ContentMaxLength = 2000;
    public const int DedupeKeyMaxLength = 200;
    public const int ErrorMaxLength = 500;

    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public NotificationType NotificationType { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? DedupeKey { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset NextAttemptAt { get; set; }
    public DateTimeOffset? SentAt { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }

    public bool IsGivenUp => SentAt is null && Attempts >= MaxAttempts;

    public void GiveUp(string error)
    {
        Attempts = MaxAttempts;
        LastError = error;
    }
}
