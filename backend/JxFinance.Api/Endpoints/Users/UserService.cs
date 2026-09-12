using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth;
using JxFinance.Endpoints.Users.CreateUser;
using JxFinance.Endpoints.Users.UpdateMyProfile;
using JxFinance.Endpoints.Users.UpdateUserRole;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Users;

public sealed class UserService(UserManager<AppUser> userManager, IAuthService authService, AppDbContext db) : IUserService
{
    public async Task<IReadOnlyList<UserProfileResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var users = await userManager.Users.OrderBy(u => u.Email).ToListAsync(cancellationToken);
        var profiles = new List<UserProfileResponse>(users.Count);
        foreach (var user in users)
        {
            profiles.Add(await authService.ToProfileAsync(user));
        }

        return profiles;
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
            return Result<UserProfileResponse>.Failure(
                ErrorCodes.Validation,
                string.Join("; ", identityResult.Errors.Select(e => e.Description)));
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
            return Result<UserProfileResponse>.Failure(ErrorCodes.Forbidden, "You cannot change your own role.");
        }

        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null)
        {
            return Result<UserProfileResponse>.Failure(ErrorCodes.NotFound, "User not found.");
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        await userManager.RemoveFromRolesAsync(user, currentRoles);
        await userManager.AddToRoleAsync(user, request.Role);

        await userManager.UpdateSecurityStampAsync(user);
        return Result<UserProfileResponse>.Success(await authService.ToProfileAsync(user));
    }

    public async Task<Result<Guid>> DeactivateAsync(Guid id, Guid currentUserId, CancellationToken cancellationToken)
    {
        if (id == currentUserId)
        {
            return Result<Guid>.Failure(ErrorCodes.Forbidden, "You cannot deactivate your own account.");
        }

        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null)
        {
            return Result<Guid>.Failure(ErrorCodes.NotFound, "User not found.");
        }

        user.LockoutEnabled = true;
        await userManager.SetLockoutEndDateAsync(user, DateTimeOffset.MaxValue);
        await userManager.UpdateSecurityStampAsync(user);

        return Result<Guid>.Success(id);
    }

    public async Task<Result<UserProfileResponse>> UpdateOwnProfileAsync(
        Guid userId,
        UpdateMyProfileRequest request,
        CancellationToken cancellationToken)
    {
        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            return Result<UserProfileResponse>.Failure(ErrorCodes.NotFound, "User not found.");
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        user.DisplayName = request.DisplayName;
        var profileResult = await userManager.UpdateAsync(user);
        if (!profileResult.Succeeded)
            return Result<UserProfileResponse>.Failure(ErrorCodes.Validation, string.Join("; ", profileResult.Errors.Select(e => e.Description)));

        if (request.NewPassword is not null)
        {
            var passwordResult = await userManager.ChangePasswordAsync(
                user,
                request.CurrentPassword!,
                request.NewPassword);
            if (!passwordResult.Succeeded)
            {
                return Result<UserProfileResponse>.Failure(
                    ErrorCodes.Validation,
                    string.Join("; ", passwordResult.Errors.Select(e => e.Description)));
            }
        }

        await transaction.CommitAsync(cancellationToken);
        return Result<UserProfileResponse>.Success(await authService.ToProfileAsync(user));
    }
}
