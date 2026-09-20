using System.Linq.Expressions;
using Microsoft.AspNetCore.Identity;

namespace JxFinance.Infrastructure.Auth;

public sealed class AppUser : IdentityUser<Guid>
{
    public static readonly DateTimeOffset DeactivatedUntil = DateTimeOffset.MaxValue;

    public static readonly Expression<Func<AppUser, bool>> IsActive =
        u => u.PasswordHash != null && (u.LockoutEnd == null || u.LockoutEnd < DeactivatedUntil);

    public string DisplayName { get; set; } = string.Empty;

    public bool IsDeactivated => LockoutEnd >= DeactivatedUntil;
}
