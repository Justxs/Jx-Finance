using JxFinance.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace JxFinance.Common;

public static class UniqueSave
{
    public static async Task<DomainError?> SaveOrConflictAsync(
        this DbContext db,
        DomainError conflict,
        CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return null;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return conflict;
        }
    }
}
