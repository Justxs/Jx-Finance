using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.Auth;

public static class PasswordReset
{
    public static async Task CompleteAsync(
        UserManager<AppUser> users,
        AppDbContext db,
        AppUser user,
        CancellationToken cancellationToken)
    {
        if (!user.IsDeactivated)
        {
            await users.SetLockoutEndDateAsync(user, null);
        }

        await users.ResetAccessFailedCountAsync(user);
        await db.PersonalApiTokens.Where(t => t.UserId == user.Id).ExecuteDeleteAsync(cancellationToken);
    }
}
