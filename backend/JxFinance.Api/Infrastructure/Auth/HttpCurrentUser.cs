using System.Security.Claims;
using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Auth;

public sealed class HttpCurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    public Guid Id
    {
        get
        {
            var principal = httpContextAccessor.HttpContext?.User;
            if (principal?.Identity?.IsAuthenticated is not true)
                return Guid.Empty;

            return Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var id) && id != Guid.Empty
                ? id
                : throw new InvalidOperationException("The authenticated principal carries no valid user id.");
        }
    }
}
