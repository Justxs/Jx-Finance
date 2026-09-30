namespace JxFinance.Infrastructure.Auth;

public sealed class PersonalApiToken
{
    public const int NameMaxLength = 60;
    public const int MaxActivePerUser = 10;
    public const int MaxLifetimeDays = 365;
    public const int MaxWritableLifetimeDays = 90;

    public static readonly TimeSpan LastUsedPrecision = TimeSpan.FromMinutes(1);

    public static readonly TimeSpan KeptAfterExpiry = TimeSpan.FromDays(30);

    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Prefix { get; set; } = string.Empty;

    public string SecretHash { get; set; } = string.Empty;

    public TokenAccess Access { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? LastUsedAt { get; set; }
}
