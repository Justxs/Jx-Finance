using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.CreateUser;
using JxFinance.Endpoints.Users.GetUsers;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Endpoints.Users.ResetUserPassword;
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
    AppDbContext db) : IUserService
{
    public async Task<IReadOnlyList<UserProfileResponse>> GetAllAsync(
        GetUsersRequest request,
        CancellationToken cancellationToken)
    {
        var query = userManager.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = LikePattern.Contains(request.Search);
            query = query.Where(u =>
                EF.Functions.ILike(u.DisplayName, search, LikePattern.Escape) ||
                (u.Email != null && EF.Functions.ILike(u.Email, search, LikePattern.Escape)));
        }

        var users = await query.OrderBy(u => u.Email).ToListAsync(cancellationToken);
        var profiles = new List<UserProfileResponse>(users.Count);
        foreach (var user in users)
        {
            profiles.Add(await authService.ToProfileAsync(user));
        }

        IEnumerable<UserProfileResponse> filtered = profiles;
        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            filtered = filtered.Where(p => string.Equals(p.Role, request.Role, StringComparison.OrdinalIgnoreCase));
        }

        if (request.IsActive is { } isActive)
        {
            filtered = filtered.Where(p => p.IsActive == isActive);
        }

        Func<UserProfileResponse, IComparable> key = request.Sort switch
        {
            UserSortField.Email => p => p.Email,
            UserSortField.Role => p => p.Role,
            UserSortField.Status => p => p.IsActive,
            _ => p => p.DisplayName,
        };

        return request.Direction == SortDirection.Desc
            ? filtered.OrderByDescending(key).ToList()
            : filtered.OrderBy(key).ToList();
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

        var identityResult = await userManager.CreateAsync(user, request.Password);
        if (!identityResult.Succeeded)
        {
            return identityResult.ToDomainError();
        }

        await userManager.AddToRoleAsync(user, request.Role);
        await StarterCategories.SeedAsync(db, user.Id, cancellationToken);
        await accountEmails.SendVerificationAsync(user.Id, cancellationToken);
        return await authService.ToProfileAsync(user);
    }

    public async Task<Result<UserProfileResponse>> ChangeRoleAsync(
        Guid id,
        UpdateUserRoleRequest request,
        Guid currentUserId,
        CancellationToken cancellationToken)
    {
        if (id == currentUserId)
        {
            return new DomainError(ErrorCodes.UserSelfChange, "You cannot change your own role.");
        }

        await using var transaction = await BeginAdministratorChangeAsync(cancellationToken);
        var found = await userManager.Users.FindOrNotFoundAsync(u => u.Id == id, "User not found.", cancellationToken);
        if (!found.TryGetValue(out var user))
        {
            return found.Error;
        }

        if (request.Role != AppRoles.Admin && await IsLastAdministratorAsync(id, cancellationToken))
        {
            return new DomainError(ErrorCodes.UserLastAdministrator, "The last administrator cannot be demoted.");
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        await userManager.RemoveFromRolesAsync(user, currentRoles);
        await userManager.AddToRoleAsync(user, request.Role);

        await userManager.UpdateSecurityStampAsync(user);
        await transaction.CommitAsync(cancellationToken);
        return await authService.ToProfileAsync(user);
    }

    public async Task<Result<Guid>> DeactivateAsync(Guid id, Guid currentUserId, CancellationToken cancellationToken)
    {
        if (id == currentUserId)
        {
            return new DomainError(ErrorCodes.UserSelfChange, "You cannot deactivate your own account.");
        }

        await using var transaction = await BeginAdministratorChangeAsync(cancellationToken);
        var found = await userManager.Users.FindOrNotFoundAsync(u => u.Id == id, "User not found.", cancellationToken);
        if (!found.TryGetValue(out var user))
        {
            return found.Error;
        }

        if (await IsLastAdministratorAsync(id, cancellationToken))
        {
            return new DomainError(ErrorCodes.UserLastAdministrator, "The last administrator cannot be deactivated.");
        }

        user.LockoutEnabled = true;
        await userManager.SetLockoutEndDateAsync(user, AppUser.DeactivatedUntil);
        await userManager.UpdateSecurityStampAsync(user);
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
            join user in db.Users on userRole.UserId equals user.Id
            where role.Name == AppRoles.Admin && (user.LockoutEnd == null || user.LockoutEnd < AppUser.DeactivatedUntil)
            select user.Id).ToListAsync(cancellationToken);
        return administrators.Contains(id) && administrators.Count == 1;
    }

    public async Task<Result<Guid>> ReactivateAsync(Guid id, CancellationToken cancellationToken)
    {
        var found = await userManager.Users.FindOrNotFoundAsync(u => u.Id == id, "User not found.", cancellationToken);
        if (!found.TryGetValue(out var user))
        {
            return found.Error;
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
        Guid id,
        ResetUserPasswordRequest request,
        Guid currentUserId,
        CancellationToken cancellationToken)
    {
        if (id == currentUserId)
        {
            return new DomainError(ErrorCodes.UserSelfChange, "Change your own password on your profile.");
        }

        var administrator = await userManager.Users.FirstOrDefaultAsync(u => u.Id == currentUserId, cancellationToken);
        if (administrator is null)
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Only administrators can reset a password.");
        }

        var confirmed = await authService.ConfirmPasswordAsync(administrator, request.CurrentPassword, ErrorCodes.PasswordIncorrect);
        if (confirmed.IsFailure)
        {
            return confirmed.Error;
        }

        var found = await userManager.Users.FindOrNotFoundAsync(u => u.Id == id, "User not found.", cancellationToken);
        if (!found.TryGetValue(out var user))
        {
            return found.Error;
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
        }

        if (!user.IsDeactivated)
        {
            await userManager.SetLockoutEndDateAsync(user, null);
        }

        await userManager.ResetAccessFailedCountAsync(user);
        await userManager.UpdateSecurityStampAsync(user);
        await transaction.CommitAsync(cancellationToken);

        return await authService.ToProfileAsync(user);
    }

    public async Task<Result<UserProfileResponse>> UpdateOwnProfileAsync(
        Guid userId,
        UpdateMyProfileRequest request,
        CancellationToken cancellationToken)
    {
        var found = await userManager.Users.FindOrNotFoundAsync(u => u.Id == userId, "User not found.", cancellationToken);
        if (!found.TryGetValue(out var user))
        {
            return found.Error;
        }

        if (request.NewPassword is not null)
        {
            var confirmed = await authService.ConfirmPasswordAsync(user, request.CurrentPassword, ErrorCodes.PasswordIncorrect);
            if (confirmed.IsFailure)
            {
                return confirmed.Error;
            }
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        user.DisplayName = request.DisplayName;
        user.BillReminderEmails = request.BillReminderEmails;
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
        return await authService.ToProfileAsync(user);
    }
}
