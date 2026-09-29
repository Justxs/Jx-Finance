using JxFinance.Domain.Common;

namespace JxFinance.Domain.Receipts;

public sealed class ReceiptReading : OwnableEntity
{
    public const int Sha256Length = 64;
    public const int ErrorCodeMaxLength = 60;

    public static readonly TimeSpan PendingTimeout = TimeSpan.FromMinutes(5);

    public static readonly TimeSpan UnattachedLifetime = TimeSpan.FromHours(24);

    public ReceiptReadingId Id { get; set; } = ReceiptReadingId.New();
    public required string Sha256 { get; set; }
    public ReceiptReadingStatus Status { get; set; }
    public required string Model { get; set; }
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
    public ReceiptResult? Result { get; set; }
    public string? ErrorCode { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}
