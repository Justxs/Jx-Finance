using System.Text.Encodings.Web;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Login;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Auth.Services;

[RegisterService<IAuthService>(LifeTime.Scoped)]
public sealed class AuthService(
    UserManager<AppUser> userManager,
    RoleManager<AppRole> roleManager,
    AppDbContext db,
    ICurrentUser currentUser,
    ISessionService sessions,
    IClock clock) : IAuthService
{
    private static readonly DomainError UserMissing = EntityLookup.NotFound("The signed-in user no longer exists.");

    private static readonly DomainError InvalidCode = new(ErrorCodes.TwoFactorInvalidCode, "Invalid authenticator code.");

    public Task<bool> IsSetupNeededAsync(CancellationToken cancellationToken) =>
        userManager.Users.AllAsync(u => u.PasswordHash == null, cancellationToken);

    public async Task<Result<AppUser>> ProvisionAdminAsync(
        string email,
        string password,
        string displayName,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(AppLock.FirstRunSetup, cancellationToken);
        if (!await IsSetupNeededAsync(cancellationToken))
        {
            return new DomainError(ErrorCodes.SetupAlreadyCompleted, "Setup has already been completed.");
        }

        var user = await userManager.Users.OrderBy(u => u.Id).FirstOrDefaultAsync(cancellationToken);
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
            identityResult = await userManager.UpdateAsync(user);
            if (identityResult.Succeeded)
            {
                identityResult = await userManager.AddPasswordAsync(user, password);
            }
        }

        if (!identityResult.Succeeded)
        {
            return identityResult.ToDomainError();
        }

        await EnsureRolesExistAsync();
        if (await userManager.AddToRoleAsync(user, AppRoles.Admin) is { Succeeded: false } assigned)
        {
            return assigned.ToDomainError();
        }

        await StarterCategories.SeedAsync(db, user.Id, cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return user;
    }

    public async Task<Result<AppUser>> ValidateCredentialsAsync(
        string email,
        string password,
        CancellationToken cancellationToken)
    {
        var rejected = new DomainError(ErrorCodes.CredentialsInvalid, "Invalid email or password.");
        var user = await userManager.FindByEmailAsync(email);
        if (user is not { CanSignIn: true })
        {
            return rejected;
        }

        var failure = await AttemptAsync(
            user,
            () => userManager.CheckPasswordAsync(user, password),
            rejected,
            completesSignIn: !user.TwoFactorEnabled);
        return failure is null ? user : failure;
    }

    public async Task<Result<LoginResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var credentials = await ValidateCredentialsAsync(request.Email.Trim(), request.Password, cancellationToken);
        if (!credentials.TryGetValue(out var user))
        {
            return credentials.Error;
        }

        if (user.TwoFactorEnabled)
        {
            if (string.IsNullOrWhiteSpace(request.TwoFactorCode))
            {
                return new LoginResponse(true, null);
            }

            if (await ConsumeTwoFactorCodeAsync(user, request.TwoFactorCode) is { } failure)
            {
                return failure;
            }
        }

        await sessions.SignInAsync(user, request.RememberMe, cancellationToken);
        return new LoginResponse(false, await ToProfileAsync(user));
    }

    public async Task<Result> ConfirmPasswordAsync(AppUser user, string? password)
    {
        var failure = await AttemptAsync(
            user,
            async () => !string.IsNullOrWhiteSpace(password) && await userManager.CheckPasswordAsync(user, password),
            new DomainError(ErrorCodes.PasswordIncorrect, "The password could not be confirmed."),
            completesSignIn: true);
        return failure ?? Result.Success();
    }

    public async Task<Result<AppUser>> ReauthenticateAsync(
        string? password,
        DomainError missing,
        CancellationToken cancellationToken)
    {
        if (await CurrentAsync(cancellationToken) is not { } user)
        {
            return missing;
        }

        var confirmed = await ConfirmPasswordAsync(user, password);
        return confirmed.IsSuccess ? user : confirmed.Error;
    }

    public async Task<UserProfileResponse> ToProfileAsync(AppUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        return ToProfile(user, roles.Contains(AppRoles.Admin) ? AppRoles.Admin : AppRoles.Member);
    }

    public UserProfileResponse ToProfile(AppUser user, string role) => new(
        user.Id,
        user.Email!,
        user.DisplayName,
        role,
        user.TwoFactorEnabled,
        !user.IsDeactivated,
        user.EmailConfirmed,
        user.EmailNotificationTypes,
        user.Language,
        user.MonthlyDigestEverything,
        user.MonthlyDigestHouseholdIds);

    public async Task<Result<UserProfileResponse>> GetCurrentProfileAsync(CancellationToken cancellationToken) =>
        await CurrentAsync(cancellationToken) is { } user ? await ToProfileAsync(user) : UserMissing;

    public Task<AppUser?> CurrentAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.Id;
        return userManager.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    public async Task<Result<TwoFactorSetupResponse>> SetupTwoFactorAsync(string? password, CancellationToken cancellationToken)
    {
        if (await CurrentAsync(cancellationToken) is not { } user)
        {
            return UserMissing;
        }

        if (user.TwoFactorEnabled)
        {
            return new DomainError(ErrorCodes.TwoFactorAlreadyEnabled, "Two-factor authentication is already on.");
        }

        var confirmed = await ConfirmPasswordAsync(user, password);
        if (confirmed.IsFailure)
        {
            return confirmed.Error;
        }

        var sharedKey = await userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrEmpty(sharedKey))
        {
            await userManager.ResetAuthenticatorKeyAsync(user);
            sharedKey = await userManager.GetAuthenticatorKeyAsync(user);
        }

        await sessions.RenewAsync(user, cancellationToken);
        return new TwoFactorSetupResponse(sharedKey!, BuildAuthenticatorUri(user.Email!, sharedKey!));
    }

    public async Task<Result<IReadOnlyList<string>>> EnableTwoFactorAsync(string code, CancellationToken cancellationToken)
    {
        if (await CurrentAsync(cancellationToken) is not { } user)
        {
            return UserMissing;
        }

        var failure = await AttemptAsync(
            user,
            () => AuthenticatorCode.ConsumeAsync(userManager, user, code, clock.UtcNow),
            InvalidCode,
            completesSignIn: true);
        if (failure is not null)
        {
            return failure;
        }

        await userManager.SetTwoFactorEnabledAsync(user, true);
        var recoveryCodes = await userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
        await sessions.RenewAsync(user, cancellationToken);

        return recoveryCodes!.ToList();
    }

    public async Task<Result> DisableTwoFactorAsync(string? password, CancellationToken cancellationToken)
    {
        var reauthenticated = await ReauthenticateAsync(password, UserMissing, cancellationToken);
        if (!reauthenticated.TryGetValue(out var user))
        {
            return reauthenticated.Error;
        }

        await userManager.SetTwoFactorEnabledAsync(user, false);
        await userManager.ResetAuthenticatorKeyAsync(user);
        await sessions.RenewAsync(user, cancellationToken);
        return Result.Success();
    }

    private Task<DomainError?> ConsumeTwoFactorCodeAsync(AppUser user, string code) =>
        AttemptAsync(
            user,
            async () => await AuthenticatorCode.ConsumeAsync(userManager, user, code, clock.UtcNow)
                || (await userManager.RedeemTwoFactorRecoveryCodeAsync(user, code)).Succeeded,
            InvalidCode,
            completesSignIn: true);

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
