using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.CreateUser;
using JxFinance.Endpoints.Users.GetUsers;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Endpoints.Users.ResetUserPassword;
using JxFinance.Endpoints.Users.UpdateMyDigestScopes;
using JxFinance.Endpoints.Users.UpdateMyDiscordNotifications;
using JxFinance.Endpoints.Users.UpdateMyEmailNotifications;
using JxFinance.Endpoints.Users.UpdateMyLanguage;
using JxFinance.Endpoints.Users.UpdateMyProfile;
using JxFinance.Endpoints.Users.UpdateUserRole;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace JxFinance.Endpoints.Users.Services;

[RegisterService<IUserService>(LifeTime.Scoped)]
public sealed class UserService(
    UserManager<AppUser> userManager,
    IAuthService authService,
    IAccountEmailService accountEmails,
    ICurrentUser currentUser,
    ISessionService sessions,
    AppDbContext db) : IUserService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("User not found.");

    public async Task<IReadOnlyList<UserProfileResponse>> GetAllAsync(
        GetUsersRequest request,
        CancellationToken cancellationToken)
    {
        var wantedRole = request.Role;
        if (!string.IsNullOrWhiteSpace(wantedRole)
            && !AppRoles.All.Any(role => string.Equals(role, wantedRole, StringComparison.OrdinalIgnoreCase)))
        {
            return [];
        }

        var query = userManager.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = LikePattern.Contains(request.Search);
            query = query.Where(u =>
                EF.Functions.ILike(u.DisplayName, search, LikePattern.Escape) ||
                (u.Email != null && EF.Functions.ILike(u.Email, search, LikePattern.Escape)));
        }

        if (request.IsActive is { } isActive)
        {
            query = isActive
                ? query.Where(AppUser.IsNotDeactivated)
                : query.Where(u => u.LockoutEnd >= AppUser.DeactivatedUntil);
        }

        var rows = query.Select(u => new
        {
            User = u,
            IsAdmin = db.UserRoles.Any(link =>
                link.UserId == u.Id && db.Roles.Any(role => role.Id == link.RoleId && role.Name == AppRoles.Admin)),
        });

        if (!string.IsNullOrWhiteSpace(wantedRole))
        {
            var wantsAdmin = string.Equals(wantedRole, AppRoles.Admin, StringComparison.OrdinalIgnoreCase);
            rows = rows.Where(row => row.IsAdmin == wantsAdmin);
        }

        var profiles = (await rows.OrderBy(row => row.User.Email).ToListAsync(cancellationToken))
            .Select(row => authService.ToProfile(row.User, row.IsAdmin ? AppRoles.Admin : AppRoles.Member))
            .ToList();

        Func<UserProfileResponse, IComparable> key = request.Sort switch
        {
            UserSortField.Email => p => p.Email,
            UserSortField.Role => p => p.Role,
            UserSortField.Status => p => p.IsActive,
            _ => p => p.DisplayName,
        };

        return request.Direction == SortDirection.Desc
            ? profiles.OrderByDescending(key).ToList()
            : profiles.OrderBy(key).ToList();
    }

    public async Task<Result<UserProfileResponse>> CreateAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        var user = new AppUser
        {
            Email = request.Email,
            UserName = request.Email,
            DisplayName = request.DisplayName,
        };

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        if (await userManager.CreateAsync(user, request.Password) is { Succeeded: false } created)
        {
            return created.ToDomainError();
        }

        if (await userManager.AddToRoleAsync(user, request.Role) is { Succeeded: false } assigned)
        {
            return assigned.ToDomainError();
        }

        await StarterCategories.SeedAsync(db, user.Id, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        await accountEmails.SendVerificationAsync(user.Id, cancellationToken);
        return await authService.ToProfileAsync(user);
    }

    public async Task<Result<UserProfileResponse>> ChangeRoleAsync(
        UpdateUserRoleRequest request,
        CancellationToken cancellationToken)
    {
        var id = request.Id;
        if (id == currentUser.Id)
        {
            return new DomainError(ErrorCodes.UserSelfChange, "You cannot change your own role.");
        }

        await using var transaction = await BeginAdministratorChangeAsync(cancellationToken);
        if (await FindAsync(id, cancellationToken) is not { } user)
        {
            return NotFound;
        }

        if (request.Role != AppRoles.Admin && await IsLastAdministratorAsync(id, cancellationToken))
        {
            return new DomainError(ErrorCodes.UserLastAdministrator, "The last administrator cannot be demoted.");
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        if (await userManager.RemoveFromRolesAsync(user, currentRoles) is { Succeeded: false } removed)
        {
            return removed.ToDomainError();
        }

        if (await userManager.AddToRoleAsync(user, request.Role) is { Succeeded: false } assigned)
        {
            return assigned.ToDomainError();
        }

        await userManager.UpdateSecurityStampAsync(user);
        await transaction.CommitAsync(cancellationToken);
        return await authService.ToProfileAsync(user);
    }

    public async Task<Result<Guid>> DeactivateAsync(Guid id, CancellationToken cancellationToken)
    {
        if (id == currentUser.Id)
        {
            return new DomainError(ErrorCodes.UserSelfChange, "You cannot deactivate your own account.");
        }

        await using var transaction = await BeginAdministratorChangeAsync(cancellationToken);
        if (await FindAsync(id, cancellationToken) is not { } user)
        {
            return NotFound;
        }

        if (await IsLastAdministratorAsync(id, cancellationToken))
        {
            return new DomainError(ErrorCodes.UserLastAdministrator, "The last administrator cannot be deactivated.");
        }

        user.LockoutEnabled = true;
        await userManager.SetLockoutEndDateAsync(user, AppUser.DeactivatedUntil);
        await userManager.UpdateSecurityStampAsync(user);
        await db.PersonalApiTokens.Where(t => t.UserId == user.Id).ExecuteDeleteAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return id;
    }

    private async Task<IDbContextTransaction> BeginAdministratorChangeAsync(CancellationToken cancellationToken)
    {
        var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(AppLock.AdministratorChange, cancellationToken);
        return transaction;
    }

    private async Task<bool> IsLastAdministratorAsync(Guid id, CancellationToken cancellationToken)
    {
        var administrators = await (
            from userRole in db.UserRoles
            join role in db.Roles on userRole.RoleId equals role.Id
            join user in db.Users.Where(AppUser.IsNotDeactivated) on userRole.UserId equals user.Id
            where role.Name == AppRoles.Admin
            select user.Id).ToListAsync(cancellationToken);
        return administrators.Contains(id) && administrators.Count == 1;
    }

    public async Task<Result<Guid>> ReactivateAsync(Guid id, CancellationToken cancellationToken)
    {
        if (await FindAsync(id, cancellationToken) is not { } user)
        {
            return NotFound;
        }

        if (!user.IsDeactivated)
        {
            return id;
        }

        await userManager.SetLockoutEndDateAsync(user, null);
        await userManager.ResetAccessFailedCountAsync(user);
        await userManager.UpdateSecurityStampAsync(user);

        return id;
    }

    public async Task<Result<UserProfileResponse>> ResetPasswordAsync(
        ResetUserPasswordRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Id == currentUser.Id)
        {
            return new DomainError(ErrorCodes.UserSelfChange, "Change your own password on your profile.");
        }

        var reauthenticated = await authService.ReauthenticateAsync(
            request.CurrentPassword,
            new DomainError(ErrorCodes.AccessForbidden, "Only administrators can reset a password."),
            cancellationToken);
        if (reauthenticated.IsFailure)
        {
            return reauthenticated.Error;
        }

        if (await FindAsync(request.Id, cancellationToken) is not { } user)
        {
            return NotFound;
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var passwordResult = await userManager.ResetPasswordAsync(user, token, request.NewPassword);
        if (!passwordResult.Succeeded)
        {
            return passwordResult.ToDomainError();
        }

        if (request.ResetTwoFactor)
        {
            await userManager.SetTwoFactorEnabledAsync(user, false);
            await userManager.ResetAuthenticatorKeyAsync(user);
            await userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 0);
            await db.UserPasskeys.Where(p => p.UserId == user.Id).ExecuteDeleteAsync(cancellationToken);
        }

        await PasswordReset.CompleteAsync(userManager, db, user, cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await authService.ToProfileAsync(user);
    }

    public async Task<Result<UserProfileResponse>> UpdateOwnProfileAsync(
        UpdateMyProfileRequest request,
        CancellationToken cancellationToken)
    {
        if (await FindAsync(currentUser.Id, cancellationToken) is not { } user)
        {
            return NotFound;
        }

        if (request.NewPassword is not null)
        {
            var confirmed = await authService.ConfirmPasswordAsync(user, request.CurrentPassword);
            if (confirmed.IsFailure)
            {
                return confirmed.Error;
            }
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        user.DisplayName = request.DisplayName;
        var profileResult = await userManager.UpdateAsync(user);
        if (!profileResult.Succeeded)
            return profileResult.ToDomainError();

        if (request.NewPassword is not null)
        {
            var passwordResult = await userManager.ChangePasswordAsync(
                user,
                request.CurrentPassword!,
                request.NewPassword);
            if (!passwordResult.Succeeded)
            {
                return passwordResult.ToDomainError();
            }
        }

        await transaction.CommitAsync(cancellationToken);
        var profile = await authService.ToProfileAsync(user);
        if (request.NewPassword is not null)
        {
            await sessions.RenewAsync(user, cancellationToken);
        }

        return profile;
    }

    public Task<Result<UserProfileResponse>> UpdateOwnEmailNotificationsAsync(
        UpdateMyEmailNotificationsRequest request,
        CancellationToken cancellationToken) =>
        UpdateOwnAsync(user => user.EmailNotificationTypes = [.. request.Types], cancellationToken);

    public Task<Result<UserProfileResponse>> UpdateOwnDiscordNotificationsAsync(
        UpdateMyDiscordNotificationsRequest request,
        CancellationToken cancellationToken) =>
        UpdateOwnAsync(user => user.DiscordNotificationTypes = [.. request.Types], cancellationToken);

    public Task<Result<UserProfileResponse>> UpdateOwnLanguageAsync(
        UpdateMyLanguageRequest request,
        CancellationToken cancellationToken) =>
        UpdateOwnAsync(user => user.Language = request.Language, cancellationToken);

    public async Task<Result<UserProfileResponse>> UpdateOwnDigestScopesAsync(
        UpdateMyDigestScopesRequest request,
        CancellationToken cancellationToken)
    {
        var chosen = request.HouseholdIds.Select(id => new HouseholdId(id)).ToList();
        var member = await db.Households.CountAsync(h => chosen.Contains(h.Id), cancellationToken);
        if (member != chosen.Count)
        {
            return new DomainError(ErrorCodes.HouseholdNotMember, "You are not a member of that household.");
        }

        return await UpdateOwnAsync(
            user =>
            {
                user.MonthlyDigestEverything = request.Everything;
                user.MonthlyDigestHouseholdIds = [.. request.HouseholdIds];
            },
            cancellationToken);
    }

    private async Task<Result<UserProfileResponse>> UpdateOwnAsync(Action<AppUser> change, CancellationToken cancellationToken)
    {
        if (await FindAsync(currentUser.Id, cancellationToken) is not { } user)
        {
            return NotFound;
        }

        change(user);
        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return result.ToDomainError();
        }

        return await authService.ToProfileAsync(user);
    }

    private Task<AppUser?> FindAsync(Guid id, CancellationToken cancellationToken) =>
        userManager.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
}
