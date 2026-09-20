using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.CreateUser;
using JxFinance.Endpoints.Users.GetUsers;
using JxFinance.Endpoints.Users.ResetUserPassword;
using JxFinance.Endpoints.Users.UpdateMyProfile;
using JxFinance.Endpoints.Users.UpdateUserRole;

namespace JxFinance.Endpoints.Users.Interfaces;

public interface IUserService
{
    Task<IReadOnlyList<UserProfileResponse>> GetAllAsync(
        GetUsersRequest request,
        CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> ChangeRoleAsync(
        Guid id,
        UpdateUserRoleRequest request,
        Guid currentUserId,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeactivateAsync(Guid id, Guid currentUserId, CancellationToken cancellationToken);

    Task<Result<Guid>> ReactivateAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> ResetPasswordAsync(
        Guid id,
        ResetUserPasswordRequest request,
        Guid currentUserId,
        CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> UpdateOwnProfileAsync(
        Guid userId,
        UpdateMyProfileRequest request,
        CancellationToken cancellationToken);
}
