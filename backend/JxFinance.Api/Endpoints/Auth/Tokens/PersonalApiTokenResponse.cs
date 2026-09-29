namespace JxFinance.Endpoints.Auth.Tokens;

public sealed record PersonalApiTokenResponse(
    Guid Id,
    string Name,
    string Prefix,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt,
    DateTimeOffset? LastUsedAt,
    bool IsExpired);
