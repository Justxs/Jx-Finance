using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.Auth.Shared;

public sealed record UserProfileResponse(
    Guid Id,
    string Email,
    string DisplayName,
    string Role,
    bool TwoFactorEnabled,
    bool IsActive,
    bool EmailConfirmed,
    IReadOnlyList<NotificationType> EmailNotificationTypes,
    string? Language);
