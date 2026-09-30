using JxFinance.Domain.Investments;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Holdings;

public static class HeldSecurities
{
    public static async Task<IReadOnlyDictionary<SecurityId, DateOnly>> FirstTradesAsync(
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        var entries = await db.InvestmentTransactions
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .AsNoTracking()
            .Where(t => t.SecurityId != null && Portfolio.PositionTypes.Contains(t.Type))
            .ToListAsync(cancellationToken);

        var held = entries
            .GroupBy(t => t.AccountId)
            .SelectMany(account => Portfolio.Positions(account).Values)
            .Where(position => position.Quantity != 0m)
            .Select(position => position.SecurityId)
            .ToHashSet();

        return entries
            .Where(t => held.Contains(t.SecurityId!.Value))
            .GroupBy(t => t.SecurityId!.Value)
            .ToDictionary(g => g.Key, g => g.Min(t => t.Date));
    }
}
