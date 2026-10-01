using FastEndpoints;
using JxFinance.Common.Spreads;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.CategoryAttributions;

[RegisterService<ICategoryAttributionService>(LifeTime.Scoped)]
public sealed class CategoryAttributionService(AppDbContext db) : ICategoryAttributionService
{
    public Task<IReadOnlyList<CategoryAttribution>> GetAttributionsAsync(
        DateWindow window,
        DateWindow? comparison,
        FlowType type,
        IReadOnlyList<SpreadSlice> shares,
        CancellationToken cancellationToken) =>
        AttributeAsync(db.Transactions, window, comparison, type, shares, cancellationToken);

    public Task<IReadOnlyList<CategoryAttribution>> GetAttributionsAsync(
        DateWindow window,
        HouseholdId household,
        FlowType type,
        CancellationToken cancellationToken) =>
        AttributeAsync(
            db.Transactions.Where(t => db.Accounts.Any(a => a.Id == t.AccountId && a.HouseholdId == household)),
            window,
            null,
            type,
            [],
            cancellationToken);

    private async Task<IReadOnlyList<CategoryAttribution>> AttributeAsync(
        IQueryable<Transaction> visible,
        DateWindow window,
        DateWindow? comparison,
        FlowType type,
        IReadOnlyList<SpreadSlice> shares,
        CancellationToken cancellationToken)
    {
        var dated = visible.Within(window, comparison);
        var nonSplit = (await dated
            .Where(t => !t.IsSplit && t.Type == type && t.SpreadMonths == null)
            .GroupBy(t => new { t.Date, t.CategoryId })
            .Select(g => new { g.Key.Date, g.Key.CategoryId, Amount = g.Sum(t => t.ReportingAmount) })
            .ToListAsync(cancellationToken))
            .Select(g => new CategoryAttribution(g.Date, g.CategoryId, g.Amount))
            .ToList();

        var spread = (await visible.SlicesAsync(window, comparison, cancellationToken))
            .Concat(shares)
            .Where(slice => slice.Type == type)
            .ToList();

        var splits = await dated
            .Where(t => t.IsSplit && t.Type == type && t.SpreadMonths == null)
            .Select(t => new { t.Id, t.Date, t.ReportingAmount })
            .ToListAsync(cancellationToken);

        var parentIds = splits.Select(t => t.Id).Concat(spread.Select(slice => slice.Id)).Distinct().ToList();
        var lines = parentIds.Count == 0
            ? []
            : await db.TransactionLines
                .Where(l => parentIds.Contains(l.TransactionId) && visible.Any(t => t.Id == l.TransactionId))
                .OrderBy(l => l.Position).ThenBy(l => l.Id)
                .Select(l => new SplitLine(l.TransactionId, l.CategoryId, (decimal)l.Amount))
                .ToListAsync(cancellationToken);
        var linesOf = lines.ToLookup(l => l.TransactionId);

        return
        [
            .. nonSplit,
            .. splits.SelectMany(t => Divide(linesOf[t.Id].ToList(), new CategoryAttribution(t.Date, null, t.ReportingAmount))),
            .. spread.SelectMany(slice => Divide(linesOf[slice.Id].ToList(), new CategoryAttribution(slice.Date, slice.CategoryId, slice.Amount))),
        ];
    }

    private static IEnumerable<CategoryAttribution> Divide(IReadOnlyList<SplitLine> lines, CategoryAttribution whole)
    {
        if (lines.Count == 0)
        {
            return [whole];
        }

        var total = lines.Sum(line => line.Amount);
        var remaining = whole.Amount;
        var last = lines.Count - 1;
        return [.. lines.Select((line, index) =>
        {
            var share = index == last || total == 0m
                ? remaining
                : Money.Round(line.Amount * whole.Amount / total);
            remaining -= share;
            return whole with { CategoryId = line.CategoryId, Amount = share };
        })];
    }

    private sealed record SplitLine(TransactionId TransactionId, CategoryId? CategoryId, decimal Amount);
}
