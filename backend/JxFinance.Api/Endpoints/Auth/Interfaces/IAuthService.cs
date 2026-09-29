using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Login;
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

    Task<Result<LoginResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken);

    Task<Result<UserProfileResponse>> GetCurrentProfileAsync(CancellationToken cancellationToken);

    Task<AppUser?> CurrentAsync(CancellationToken cancellationToken);

    Task<Result> ConfirmPasswordAsync(AppUser user, string? password);

    Task<Result<AppUser>> ReauthenticateAsync(
        string? password,
        DomainError missing,
        CancellationToken cancellationToken);

    Task<Result<TwoFactorSetupResponse>> SetupTwoFactorAsync(string? password, CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<string>>> EnableTwoFactorAsync(string code, CancellationToken cancellationToken);

    Task<Result> DisableTwoFactorAsync(string? password, CancellationToken cancellationToken);
}
