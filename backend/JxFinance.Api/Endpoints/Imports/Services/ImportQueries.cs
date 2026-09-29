using JxFinance.Domain.Accounts;
using JxFinance.Domain.Imports;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Imports.Services;

public static class ImportQueries
{
    public static async Task<CsvImportMapping?> FindMappingAsync(AppDbContext db, Guid? mappingId, CancellationToken cancellationToken)
    {
        var id = new CsvImportMappingId(mappingId ?? Guid.Empty);
        return await db.CsvImportMappings.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
    }

    public static async Task<HashSet<string>> ExistingRefsAsync(
        AppDbContext db,
        AccountId accountId,
        IEnumerable<string> refs,
        CancellationToken cancellationToken)
    {
        var importRefs = refs.ToList();
        var transactionRefs = await db.Transactions.IgnoreQueryFilters()
            .Where(t => t.AccountId == accountId && t.ImportRef != null && importRefs.Contains(t.ImportRef))
            .Select(t => t.ImportRef!)
            .ToListAsync(cancellationToken);
        var transferRefs = await db.TransferImports
            .Where(r => r.AccountId == accountId && importRefs.Contains(r.ImportRef))
            .Select(r => r.ImportRef)
            .ToListAsync(cancellationToken);
        return transactionRefs.Concat(transferRefs).ToHashSet();
    }
}
