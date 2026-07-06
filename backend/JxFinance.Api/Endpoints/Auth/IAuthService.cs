using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Auth;

public interface IAuthService
{
    Task<bool> IsSetupNeededAsync(CancellationToken cancellationToken);

    Task<Result<AppUser>> ProvisionAdminAsync(
        string email,
        string password,
        string displayName,
        CancellationToken cancellationToken);

    Task<Result<AppUser>> ValidateCredentialsAsync(
        string email,
        string password,
        CancellationToken cancellationToken);

    Task<UserProfileResponse> ToProfileAsync(AppUser user);

    Task<UserProfileResponse?> GetProfileByIdAsync(Guid userId, CancellationToken cancellationToken);

    Task<AppUser?> FindByIdAsync(Guid userId, CancellationToken cancellationToken);

    Task<bool> ConsumeTwoFactorCodeAsync(AppUser user, string code);

    Task<TwoFactorSetupResponse> BeginTwoFactorSetupAsync(AppUser user);

    Task<Result<IReadOnlyList<string>>> EnableTwoFactorAsync(AppUser user, string code);

    Task DisableTwoFactorAsync(AppUser user);
}
