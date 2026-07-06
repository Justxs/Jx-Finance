using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.CategoryAttributions;

public sealed class CategoryAttributionService(AppDbContext db) : ICategoryAttributionService
{
    public async Task<IReadOnlyList<CategoryAttribution>> GetAttributionsAsync(
        DateOnly start,
        DateOnly end,
        FlowType type,
        CancellationToken cancellationToken)
    {
        var nonSplit = await db.Transactions
            .Where(t => !t.IsSplit && t.Type == type && t.Date >= start && t.Date < end)
            .Select(t => new CategoryAttribution(t.CategoryId, (decimal)t.Amount))
            .ToListAsync(cancellationToken);

        var splitTransactionIds = await db.Transactions
            .Where(t => t.IsSplit && t.Type == type && t.Date >= start && t.Date < end)
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        if (splitTransactionIds.Count == 0)
        {
            return nonSplit;
        }

        var lineAmounts = await db.TransactionLines
            .Where(l => splitTransactionIds.Contains(l.TransactionId))
            .Select(l => new CategoryAttribution(l.CategoryId, (decimal)l.Amount))
            .ToListAsync(cancellationToken);

        return [.. nonSplit, .. lineAmounts];
    }
}
