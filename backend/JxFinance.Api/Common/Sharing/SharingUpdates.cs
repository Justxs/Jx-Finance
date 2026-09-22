using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Sharing;

public static class SharingUpdates
{
    public static Task<int> SetSharingAsync<T>(
        this IQueryable<T> rows,
        Scope scope,
        HouseholdId? householdId,
        DateTimeOffset now,
        CancellationToken cancellationToken)
        where T : EntityBase, IShareable =>
        rows.ExecuteUpdateAsync(
            setters => setters
                .SetProperty(e => e.Scope, scope)
                .SetProperty(e => e.HouseholdId, householdId)
                .SetProperty(e => e.UpdatedAt, e => e.IsDeleted ? e.UpdatedAt : now),
            cancellationToken);
}
