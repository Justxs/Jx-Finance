namespace JxFinance.Infrastructure.Auth;

public sealed class ApiIdempotencyKey
{
    public const string HeaderName = "Idempotency-Key";
    public const string ReplayedHeaderName = "Idempotency-Replayed";
    public const int KeyMaxLength = 64;
    public const int RequestHashLength = 64;
    public const int LocationMaxLength = 2048;

    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(24);

    public static readonly TimeSpan ClaimTimeout = TimeSpan.FromSeconds(60);

    public Guid TokenId { get; set; }

    public string Key { get; set; } = string.Empty;

    public string RequestHash { get; set; } = string.Empty;

    public int? StatusCode { get; set; }

    public string? Body { get; set; }

    public string? Location { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
