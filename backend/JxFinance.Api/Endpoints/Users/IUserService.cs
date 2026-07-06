using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth;
using JxFinance.Endpoints.Users.CreateUser;
using JxFinance.Endpoints.Users.UpdateMyProfile;
using JxFinance.Endpoints.Users.UpdateUserRole;

namespace JxFinance.Endpoints.Users;

public interface IUserService
{
    Task<IReadOnlyList<UserProfileResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> ChangeRoleAsync(
        Guid id,
        UpdateUserRoleRequest request,
        Guid currentUserId,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeactivateAsync(Guid id, Guid currentUserId, CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> UpdateOwnProfileAsync(
        Guid userId,
        UpdateMyProfileRequest request,
        CancellationToken cancellationToken);
}
