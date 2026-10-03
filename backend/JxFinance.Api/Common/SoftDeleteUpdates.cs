using JxFinance.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common;

public static class SoftDeleteUpdates
{
    public static Task<int> SoftDeleteAsync<T>(
        this IQueryable<T> rows,
        DateTimeOffset now,
        CancellationToken cancellationToken)
        where T : EntityBase =>
        rows.ExecuteUpdateAsync(
            setters => setters
                .SetProperty(e => e.IsDeleted, true)
                .SetProperty(e => e.UpdatedAt, now),
            cancellationToken);
}
