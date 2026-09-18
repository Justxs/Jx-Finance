using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.CategoryAttributions;

[RegisterService<ICategoryAttributionService>(LifeTime.Scoped)]
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
            .Select(t => new CategoryAttribution(t.CategoryId, t.ReportingAmount))
            .ToListAsync(cancellationToken);

        var splits = await db.Transactions
            .Where(t => t.IsSplit && t.Type == type && t.Date >= start && t.Date < end)
            .Select(t => new { t.Id, Total = t.Amount.Amount, t.ReportingAmount })
            .ToDictionaryAsync(t => t.Id, cancellationToken);

        if (splits.Count == 0)
        {
            return nonSplit;
        }

        var splitIds = splits.Keys.ToList();
        var lines = await db.TransactionLines
            .Where(l => splitIds.Contains(l.TransactionId))
            .Select(l => new { l.TransactionId, l.CategoryId, Amount = (decimal)l.Amount })
            .ToListAsync(cancellationToken);

        var lineAmounts = lines.GroupBy(l => l.TransactionId).SelectMany(group =>
        {
            var parent = splits[group.Key];
            var remaining = parent.ReportingAmount;
            return group.Select((line, index) =>
            {
                var share = index == group.Count() - 1 || parent.Total == 0m
                    ? remaining
                    : Money.Round(line.Amount * parent.ReportingAmount / parent.Total);
                remaining -= share;
                return new CategoryAttribution(line.CategoryId, share);
            }).ToList();
        });

        return [.. nonSplit, .. lineAmounts];
    }
}
