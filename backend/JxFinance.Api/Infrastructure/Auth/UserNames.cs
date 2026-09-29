using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.Auth;

public static class UserNames
{
    public static async Task<Dictionary<Guid, string>> DisplayNamesAsync(
        this IQueryable<AppUser> users,
        IEnumerable<Guid> userIds,
        CancellationToken cancellationToken)
    {
        var ids = userIds.Distinct().ToList();
        var rows = await users
            .AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .Select(u => new { u.Id, u.DisplayName, u.Email })
            .ToListAsync(cancellationToken);
        return rows.ToDictionary(u => u.Id, u => AppUser.DisplayNameOrEmail(u.DisplayName, u.Email));
    }
}
