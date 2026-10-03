using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.CreateUser;
using JxFinance.Endpoints.Users.GetUsers;
using JxFinance.Endpoints.Users.ResetUserPassword;
using JxFinance.Endpoints.Users.UpdateMyDigestScopes;
using JxFinance.Endpoints.Users.UpdateMyDiscordNotifications;
using JxFinance.Endpoints.Users.UpdateMyEmailNotifications;
using JxFinance.Endpoints.Users.UpdateMyLanguage;
using JxFinance.Endpoints.Users.UpdateMyProfile;
using JxFinance.Endpoints.Users.UpdateMyTelegramNotifications;
using JxFinance.Endpoints.Users.UpdateUserRole;

namespace JxFinance.Endpoints.Users.Interfaces;

public interface IUserService
{
    Task<IReadOnlyList<UserProfileResponse>> GetAllAsync(
        GetUsersRequest request,
        CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> ChangeRoleAsync(UpdateUserRoleRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeactivateAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<Guid>> ReactivateAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> ResetPasswordAsync(
        ResetUserPasswordRequest request,
        CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> UpdateOwnProfileAsync(
        UpdateMyProfileRequest request,
        CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> UpdateOwnEmailNotificationsAsync(
        UpdateMyEmailNotificationsRequest request,
        CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> UpdateOwnDiscordNotificationsAsync(
        UpdateMyDiscordNotificationsRequest request,
        CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> UpdateOwnTelegramNotificationsAsync(
        UpdateMyTelegramNotificationsRequest request,
        CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> UpdateOwnLanguageAsync(
        UpdateMyLanguageRequest request,
        CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> UpdateOwnDigestScopesAsync(
        UpdateMyDigestScopesRequest request,
        CancellationToken cancellationToken);
}
