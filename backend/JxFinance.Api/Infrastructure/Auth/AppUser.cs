using Microsoft.AspNetCore.Identity;

namespace JxFinance.Infrastructure.Auth;

public sealed class AppUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
}
