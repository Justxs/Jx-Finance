using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common;

public static class VersionedSave
{
    public static readonly DomainError Stale = new(
        ErrorCodes.ConflictStale,
        "Someone else changed this in the meantime. Load it again and redo your change.");

    public static async Task<DomainError?> SaveOrStaleAsync(
        this DbContext db,
        IVersioned entity,
        uint version,
        CancellationToken cancellationToken)
    {
        var entry = db.Entry(entity);
        entry.Property(nameof(IVersioned.Version)).OriginalValue = version;
        entry.Property(nameof(EntityBase.UpdatedAt)).IsModified = true;
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return null;
        }
        catch (DbUpdateConcurrencyException)
        {
            return Stale;
        }
    }
}
