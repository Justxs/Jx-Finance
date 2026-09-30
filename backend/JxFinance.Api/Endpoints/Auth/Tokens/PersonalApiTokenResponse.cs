using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Auth.Tokens;

public sealed record PersonalApiTokenResponse(
    Guid Id,
    string Name,
    string Prefix,
    TokenAccess Access,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt,
    DateTimeOffset? LastUsedAt,
    bool IsExpired);
