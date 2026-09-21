using System.Linq.Expressions;
using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.CategoryAttributions;

[RegisterService<ICategoryAttributionService>(LifeTime.Scoped)]
public sealed class CategoryAttributionService(AppDbContext db) : ICategoryAttributionService
{
    public async Task<IReadOnlyList<CategoryAttribution>> GetAttributionsAsync(
        DateWindow window,
        DateWindow? comparison,
        FlowType type,
        CancellationToken cancellationToken)
    {
        var dated = db.Transactions.Where(Within(window, comparison));

        var nonSplit = (await dated
            .Where(t => !t.IsSplit && t.Type == type)
            .GroupBy(t => new { t.Date, t.CategoryId })
            .Select(g => new { g.Key.Date, g.Key.CategoryId, Amount = g.Sum(t => t.ReportingAmount) })
            .ToListAsync(cancellationToken))
            .Select(g => new CategoryAttribution(g.Date, g.CategoryId, g.Amount))
            .ToList();

        var splits = await dated
            .Where(t => t.IsSplit && t.Type == type)
            .Select(t => new { t.Id, t.Date, Total = t.Amount.Amount, t.ReportingAmount })
            .ToDictionaryAsync(t => t.Id, cancellationToken);

        if (splits.Count == 0)
        {
            return nonSplit;
        }

        var splitIds = splits.Keys.ToList();
        var lines = await db.TransactionLines
            .Where(l => splitIds.Contains(l.TransactionId))
            .OrderBy(l => l.Id)
            .Select(l => new { l.TransactionId, l.CategoryId, Amount = (decimal)l.Amount })
            .ToListAsync(cancellationToken);

        var lineAmounts = lines.GroupBy(l => l.TransactionId).SelectMany(group =>
        {
            var parent = splits[group.Key];
            var remaining = parent.ReportingAmount;
            var last = group.Count() - 1;
            return group.Select((line, index) =>
            {
                var share = index == last || parent.Total == 0m
                    ? remaining
                    : Money.Round(line.Amount * parent.ReportingAmount / parent.Total);
                remaining -= share;
                return new CategoryAttribution(parent.Date, line.CategoryId, share);
            }).ToList();
        });

        return [.. nonSplit, .. lineAmounts];
    }

    private static Expression<Func<Transaction, bool>> Within(DateWindow window, DateWindow? comparison) =>
        comparison is { } other
            ? t => (t.Date >= window.Start && t.Date < window.ExclusiveEnd)
                || (t.Date >= other.Start && t.Date < other.ExclusiveEnd)
            : t => t.Date >= window.Start && t.Date < window.ExclusiveEnd;
}
