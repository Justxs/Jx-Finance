namespace JxFinance.Endpoints.Auth.Sessions;

public sealed record SessionResponse(
    Guid Id,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastSeenAt,
    DateTimeOffset ExpiresAt,
    bool IsPersistent,
    string? UserAgent,
    bool IsCurrent);
