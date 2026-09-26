using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Auth.Interfaces;

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

    UserProfileResponse ToProfile(AppUser user, string role);

    Task<UserProfileResponse?> GetCurrentProfileAsync(CancellationToken cancellationToken);

    Task<AppUser?> CurrentAsync(CancellationToken cancellationToken);

    Task<Result> ConfirmPasswordAsync(AppUser user, string? password, string rejectedCode);

    Task<Result<AppUser>> ReauthenticateAsync(
        string? password,
        string rejectedCode,
        DomainError missing,
        CancellationToken cancellationToken);

    Task<Result> ConsumeTwoFactorCodeAsync(AppUser user, string code);

    Task<TwoFactorSetupResponse> BeginTwoFactorSetupAsync(AppUser user);

    Task<Result<IReadOnlyList<string>>> EnableTwoFactorAsync(AppUser user, string code);

    Task DisableTwoFactorAsync(AppUser user);
}
