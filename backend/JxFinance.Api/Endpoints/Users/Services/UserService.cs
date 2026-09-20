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
public sealed class UserService(UserManager<AppUser> userManager, IAuthService authService, AppDbContext db) : IUserService
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
            EmailConfirmed = true,
        };

        var identityResult = await userManager.CreateAsync(user, request.Password);
        if (!identityResult.Succeeded)
        {
            return Result<UserProfileResponse>.Failure(identityResult.ToDomainError());
        }

        await userManager.AddToRoleAsync(user, request.Role);
        await DevDataSeeder.SeedUserCategoriesAsync(db, user.Id, cancellationToken);
        return Result<UserProfileResponse>.Success(await authService.ToProfileAsync(user));
    }

    public async Task<Result<UserProfileResponse>> ChangeRoleAsync(
        Guid id,
        UpdateUserRoleRequest request,
        Guid currentUserId,
        CancellationToken cancellationToken)
    {
        if (id == currentUserId)
        {
            return Result<UserProfileResponse>.Failure(ErrorCodes.UserSelfChange, "You cannot change your own role.");
        }

        await using var transaction = await BeginAdministratorChangeAsync(cancellationToken);
        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null)
        {
            return Result<UserProfileResponse>.Failure(ErrorCodes.ResourceNotFound, "User not found.");
        }

        if (request.Role != AppRoles.Admin && await IsLastAdministratorAsync(id, cancellationToken))
        {
            return Result<UserProfileResponse>.Failure(ErrorCodes.UserLastAdministrator, "The last administrator cannot be demoted.");
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        await userManager.RemoveFromRolesAsync(user, currentRoles);
        await userManager.AddToRoleAsync(user, request.Role);

        await userManager.UpdateSecurityStampAsync(user);
        await transaction.CommitAsync(cancellationToken);
        return Result<UserProfileResponse>.Success(await authService.ToProfileAsync(user));
    }

    public async Task<Result<Guid>> DeactivateAsync(Guid id, Guid currentUserId, CancellationToken cancellationToken)
    {
        if (id == currentUserId)
        {
            return Result<Guid>.Failure(ErrorCodes.UserSelfChange, "You cannot deactivate your own account.");
        }

        await using var transaction = await BeginAdministratorChangeAsync(cancellationToken);
        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null)
        {
            return Result<Guid>.Failure(ErrorCodes.ResourceNotFound, "User not found.");
        }

        if (await IsLastAdministratorAsync(id, cancellationToken))
        {
            return Result<Guid>.Failure(ErrorCodes.UserLastAdministrator, "The last administrator cannot be deactivated.");
        }

        user.LockoutEnabled = true;
        await userManager.SetLockoutEndDateAsync(user, AppUser.DeactivatedUntil);
        await userManager.UpdateSecurityStampAsync(user);
        await transaction.CommitAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    private async Task<IDbContextTransaction> BeginAdministratorChangeAsync(CancellationToken cancellationToken)
    {
        var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(738192437)", cancellationToken);
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
        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null)
        {
            return Result<Guid>.Failure(ErrorCodes.ResourceNotFound, "User not found.");
        }

        if (!user.IsDeactivated)
        {
            return Result<Guid>.Success(id);
        }

        await userManager.SetLockoutEndDateAsync(user, null);
        await userManager.ResetAccessFailedCountAsync(user);
        await userManager.UpdateSecurityStampAsync(user);

        return Result<Guid>.Success(id);
    }

    public async Task<Result<UserProfileResponse>> ResetPasswordAsync(
        Guid id,
        ResetUserPasswordRequest request,
        Guid currentUserId,
        CancellationToken cancellationToken)
    {
        if (id == currentUserId)
        {
            return Result<UserProfileResponse>.Failure(ErrorCodes.UserSelfChange, "Change your own password on your profile.");
        }

        var administrator = await userManager.Users.FirstOrDefaultAsync(u => u.Id == currentUserId, cancellationToken);
        if (administrator is null)
        {
            return Result<UserProfileResponse>.Failure(ErrorCodes.AccessForbidden, "Only administrators can reset a password.");
        }

        var confirmed = await authService.ConfirmPasswordAsync(administrator, request.CurrentPassword, ErrorCodes.PasswordIncorrect);
        if (confirmed.IsFailure)
        {
            return Result<UserProfileResponse>.FailureFrom(confirmed);
        }

        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null)
        {
            return Result<UserProfileResponse>.Failure(ErrorCodes.ResourceNotFound, "User not found.");
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var passwordResult = await userManager.ResetPasswordAsync(user, token, request.NewPassword);
        if (!passwordResult.Succeeded)
        {
            return Result<UserProfileResponse>.Failure(passwordResult.ToDomainError());
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

        return Result<UserProfileResponse>.Success(await authService.ToProfileAsync(user));
    }

    public async Task<Result<UserProfileResponse>> UpdateOwnProfileAsync(
        Guid userId,
        UpdateMyProfileRequest request,
        CancellationToken cancellationToken)
    {
        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            return Result<UserProfileResponse>.Failure(ErrorCodes.ResourceNotFound, "User not found.");
        }

        if (request.NewPassword is not null)
        {
            var confirmed = await authService.ConfirmPasswordAsync(user, request.CurrentPassword, ErrorCodes.PasswordIncorrect);
            if (confirmed.IsFailure)
            {
                return Result<UserProfileResponse>.FailureFrom(confirmed);
            }
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        user.DisplayName = request.DisplayName;
        var profileResult = await userManager.UpdateAsync(user);
        if (!profileResult.Succeeded)
            return Result<UserProfileResponse>.Failure(profileResult.ToDomainError());

        if (request.NewPassword is not null)
        {
            var passwordResult = await userManager.ChangePasswordAsync(
                user,
                request.CurrentPassword!,
                request.NewPassword);
            if (!passwordResult.Succeeded)
            {
                return Result<UserProfileResponse>.Failure(passwordResult.ToDomainError());
            }
        }

        await transaction.CommitAsync(cancellationToken);
        return Result<UserProfileResponse>.Success(await authService.ToProfileAsync(user));
    }
}
