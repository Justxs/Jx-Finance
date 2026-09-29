using JxFinance.Common;
using JxFinance.Domain.Tags;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Tags.Shared;

public static class TagNames
{
    public static Task<bool> TakenAsync(
        AppDbContext db,
        Guid ownerId,
        string name,
        TagId? except,
        CancellationToken cancellationToken)
    {
        var pattern = LikePattern.Exactly(name);
        var excludedId = except ?? default;
        var hasExcluded = except is not null;
        return db.Tags
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .AnyAsync(
                t => t.UserId == ownerId
                    && EF.Functions.ILike(t.Name, pattern, LikePattern.Escape)
                    && (!hasExcluded || t.Id != excludedId),
                cancellationToken);
    }
}
