using Microsoft.AspNetCore.Identity;

namespace JxFinance.Infrastructure.Auth;

public sealed class AppUser : IdentityUser<Guid>
{
    public static readonly DateTimeOffset DeactivatedUntil = DateTimeOffset.MaxValue;

    public string DisplayName { get; set; } = string.Empty;

    public bool IsDeactivated => LockoutEnd >= DeactivatedUntil;
}
