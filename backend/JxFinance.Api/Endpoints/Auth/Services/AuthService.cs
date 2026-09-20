using System.Text.Encodings.Web;
using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Auth.Services;

[RegisterService<IAuthService>(LifeTime.Scoped)]
public sealed class AuthService(UserManager<AppUser> userManager, RoleManager<AppRole> roleManager, AppDbContext db) : IAuthService
{
    public Task<bool> IsSetupNeededAsync(CancellationToken cancellationToken) =>
        userManager.Users.AllAsync(u => u.PasswordHash == null, cancellationToken);

    public async Task<Result<AppUser>> ProvisionAdminAsync(
        string email,
        string password,
        string displayName,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(738192436)", cancellationToken);
        if (!await IsSetupNeededAsync(cancellationToken))
        {
            return Result<AppUser>.Failure(ErrorCodes.SetupAlreadyCompleted, "Setup has already been completed.");
        }

        var user = await userManager.Users.FirstOrDefaultAsync(cancellationToken);
        IdentityResult identityResult;
        if (user is null)
        {
            user = new AppUser
            {
                Email = email,
                UserName = email,
                DisplayName = displayName,
                EmailConfirmed = true,
            };
            identityResult = await userManager.CreateAsync(user, password);
        }
        else
        {
            user.Email = email;
            user.UserName = email;
            user.DisplayName = displayName;
            user.EmailConfirmed = true;
            await userManager.UpdateAsync(user);
            identityResult = await userManager.AddPasswordAsync(user, password);
        }

        if (!identityResult.Succeeded)
        {
            return Result<AppUser>.Failure(identityResult.ToDomainError());
        }

        await EnsureRolesExistAsync();
        await userManager.AddToRoleAsync(user, AppRoles.Admin);
        await DevDataSeeder.SeedUserCategoriesAsync(db, user.Id, cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Result<AppUser>.Success(user);
    }

    public async Task<Result<AppUser>> ValidateCredentialsAsync(
        string email,
        string password,
        CancellationToken cancellationToken)
    {
        var rejected = new DomainError(ErrorCodes.CredentialsInvalid, "Invalid email or password.");
        var user = await userManager.FindByEmailAsync(email);
        if (user?.PasswordHash is null || user.IsDeactivated)
        {
            return Result<AppUser>.Failure(rejected);
        }

        var failure = await AttemptAsync(
            user,
            () => userManager.CheckPasswordAsync(user, password),
            rejected,
            completesSignIn: !user.TwoFactorEnabled);
        return failure is null ? Result<AppUser>.Success(user) : Result<AppUser>.Failure(failure);
    }

    public async Task<Result<bool>> ConfirmPasswordAsync(AppUser user, string? password, string rejectedCode)
    {
        var failure = await AttemptAsync(
            user,
            async () => !string.IsNullOrWhiteSpace(password) && await userManager.CheckPasswordAsync(user, password),
            new DomainError(rejectedCode, "The password could not be confirmed."),
            completesSignIn: true);
        return failure is null ? Result<bool>.Success(true) : Result<bool>.Failure(failure);
    }

    public async Task<UserProfileResponse> ToProfileAsync(AppUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        var role = roles.Contains(AppRoles.Admin) ? AppRoles.Admin : AppRoles.Member;
        var isActive = !user.IsDeactivated;
        return new UserProfileResponse(user.Id, user.Email!, user.DisplayName, role, user.TwoFactorEnabled, isActive);
    }

    public async Task<UserProfileResponse?> GetProfileByIdAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        return user is null ? null : await ToProfileAsync(user);
    }

    public Task<AppUser?> FindByIdAsync(Guid userId, CancellationToken cancellationToken) =>
        userManager.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

    public async Task<Result<bool>> ConsumeTwoFactorCodeAsync(AppUser user, string code)
    {
        var failure = await AttemptAsync(
            user,
            async () => await userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, code)
                || (await userManager.RedeemTwoFactorRecoveryCodeAsync(user, code)).Succeeded,
            new DomainError(ErrorCodes.TwoFactorInvalidCode, "Invalid authenticator code."),
            completesSignIn: true);
        return failure is null ? Result<bool>.Success(true) : Result<bool>.Failure(failure);
    }

    public async Task<TwoFactorSetupResponse> BeginTwoFactorSetupAsync(AppUser user)
    {
        var sharedKey = await userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrEmpty(sharedKey))
        {
            await userManager.ResetAuthenticatorKeyAsync(user);
            sharedKey = await userManager.GetAuthenticatorKeyAsync(user);
        }

        var authenticatorUri = BuildAuthenticatorUri(user.Email!, sharedKey!);
        return new TwoFactorSetupResponse(sharedKey!, authenticatorUri);
    }

    public async Task<Result<IReadOnlyList<string>>> EnableTwoFactorAsync(AppUser user, string code)
    {
        var isValid = await userManager.VerifyTwoFactorTokenAsync(
            user,
            TokenOptions.DefaultAuthenticatorProvider,
            code);
        if (!isValid)
        {
            return Result<IReadOnlyList<string>>.Failure(ErrorCodes.TwoFactorInvalidCode, "Invalid authenticator code.");
        }

        await userManager.SetTwoFactorEnabledAsync(user, true);
        var recoveryCodes = await userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);

        return Result<IReadOnlyList<string>>.Success(recoveryCodes!.ToList());
    }

    public async Task DisableTwoFactorAsync(AppUser user)
    {
        await userManager.SetTwoFactorEnabledAsync(user, false);
        await userManager.ResetAuthenticatorKeyAsync(user);
    }

    private async Task<DomainError?> AttemptAsync(
        AppUser user,
        Func<Task<bool>> verify,
        DomainError rejected,
        bool completesSignIn)
    {
        var lockedOut = new DomainError(
            ErrorCodes.CredentialsLockedOut,
            "Too many failed attempts. Wait 15 minutes and try again.");
        if (await userManager.IsLockedOutAsync(user))
        {
            return lockedOut;
        }

        if (await verify())
        {
            if (completesSignIn && user.AccessFailedCount > 0)
            {
                await userManager.ResetAccessFailedCountAsync(user);
            }

            return null;
        }

        await userManager.AccessFailedAsync(user);
        return await userManager.IsLockedOutAsync(user) ? lockedOut : rejected;
    }

    private static string BuildAuthenticatorUri(string email, string sharedKey)
    {
        const string issuer = "Jx Finance";
        return $"otpauth://totp/{UrlEncoder.Default.Encode(issuer)}:{UrlEncoder.Default.Encode(email)}"
            + $"?secret={sharedKey}&issuer={UrlEncoder.Default.Encode(issuer)}&digits=6";
    }

    private async Task EnsureRolesExistAsync()
    {
        foreach (var role in new[] { AppRoles.Admin, AppRoles.Member })
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new AppRole { Name = role });
            }
        }
    }
}
