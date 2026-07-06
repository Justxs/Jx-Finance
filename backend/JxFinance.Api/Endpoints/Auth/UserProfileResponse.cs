namespace JxFinance.Endpoints.Auth;

public sealed record UserProfileResponse(
    Guid Id,
    string Email,
    string DisplayName,
    string Role,
    bool TwoFactorEnabled,
    bool IsActive);
