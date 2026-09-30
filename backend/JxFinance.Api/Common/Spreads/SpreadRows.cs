using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Spreads;

public static class SpreadRows
{
    public static async Task<IReadOnlyList<SpreadSlice>> SlicesAsync(
        this IQueryable<Transaction> visible,
        DateWindow window,
        DateWindow? comparison,
        CancellationToken cancellationToken)
    {
        var start = window.Start;
        var end = window.ExclusiveEnd;
        var otherStart = comparison?.Start ?? start;
        var otherEnd = comparison?.ExclusiveEnd ?? end;
        var rows = await visible
            .Where(t => t.SpreadMonths != null
                && ((t.Date < end && t.SpreadUntil >= start) || (t.Date < otherEnd && t.SpreadUntil >= otherStart)))
            .Select(t => new
            {
                t.Id,
                t.Date,
                t.Type,
                t.CategoryId,
                t.ReportingAmount,
                Months = (int)t.SpreadMonths!.Value,
                t.PayeeKey,
                TagIds = t.Tags.Select(x => x.TagId).ToList(),
            })
            .ToListAsync(cancellationToken);

        return [.. rows.SelectMany(row => SpreadSlices.Of(row.Date, row.ReportingAmount, row.Months)
            .Where(slice => window.Contains(slice.Date) || (comparison is { } other && other.Contains(slice.Date)))
            .Select(slice => new SpreadSlice(row.Id, slice.Date, row.Type, row.CategoryId, row.PayeeKey, row.TagIds, slice.Amount)))];
    }
}
