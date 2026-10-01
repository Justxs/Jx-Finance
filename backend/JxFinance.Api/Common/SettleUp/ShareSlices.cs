using JxFinance.Common.Spreads;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.SettleUp;

public static class ShareSlices
{
    public static async Task<IReadOnlyList<SpreadSlice>> OfAsync(
        AppDbContext db,
        Guid userId,
        SpendingShare share,
        DateWindow window,
        DateWindow? comparison,
        CancellationToken cancellationToken)
    {
        if (share == SpendingShare.Full)
        {
            return [];
        }

        var parts = (await db.SharedExpenses
                .Select(e => new
                {
                    e.TransactionId,
                    e.Date,
                    Share = db.SharedExpenseShares
                        .Where(s => s.SharedExpenseId == e.Id && s.UserId == userId)
                        .Sum(s => s.Amount),
                })
                .ToListAsync(cancellationToken))
            .Select(e => new Part(e.TransactionId, e.Date, e.Share, true))
            .Concat((await db.ContactSplits
                    .Select(s => new { s.TransactionId, s.Date, Share = s.OwnAmount ?? 0m })
                    .ToListAsync(cancellationToken))
                .Select(s => new Part(s.TransactionId, s.Date, s.Share, false)))
            .ToDictionary(part => part.TransactionId);
        if (parts.Count == 0)
        {
            return [];
        }

        var from = comparison is { } before && before.Start < window.Start ? before.Start : window.Start;
        var until = comparison is { } after && after.ExclusiveEnd > window.ExclusiveEnd ? after.ExclusiveEnd : window.ExclusiveEnd;
        var ids = parts.Keys.ToList();
        var copied = parts.Values.Where(p => p.Date >= from && p.Date < until).Select(p => p.TransactionId).ToList();
        var rows = await db.Transactions
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(t => ids.Contains(t.Id) && t.Type == FlowType.Expense)
            .Where(t => copied.Contains(t.Id)
                || (t.Date >= from && t.Date < until)
                || (t.SpreadMonths != null && t.SpreadFrom < until && t.SpreadUntil >= from))
            .Select(t => new
            {
                t.Id,
                t.Date,
                t.CategoryId,
                t.ReportingAmount,
                Amount = t.Amount.Amount,
                t.SpreadMonths,
                t.SpreadDirection,
                t.PayeeKey,
                t.Place,
                TagIds = t.Tags.Select(x => x.TagId).ToList(),
            })
            .ToListAsync(cancellationToken);

        var rowIds = rows.Select(r => r.Id).ToList();
        var visible = (await db.Transactions.Where(t => rowIds.Contains(t.Id)).Select(t => t.Id).ToListAsync(cancellationToken))
            .ToHashSet();
        var categoryIds = rows.Where(r => !visible.Contains(r.Id)).Select(r => r.CategoryId).OfType<CategoryId>().Distinct().ToList();
        var categories = (await db.Categories.Where(c => categoryIds.Contains(c.Id)).Select(c => c.Id).ToListAsync(cancellationToken))
            .ToHashSet();

        bool Shown(DateOnly date) => window.Contains(date) || (comparison is { } other && other.Contains(date));

        var slices = new List<SpreadSlice>();
        foreach (var row in rows)
        {
            var part = parts[row.Id];
            var mine = row.Amount == 0m ? 0m : Money.Round(part.Share * row.ReportingAmount / row.Amount);
            if (visible.Contains(row.Id))
            {
                var change = mine - row.ReportingAmount;
                IReadOnlyList<(DateOnly Date, decimal Amount)> pieces = row.SpreadMonths is { } months
                    ? SpreadSlices.Of(row.Date, change, (int)months, row.SpreadDirection)
                    : [(row.Date, change)];
                slices.AddRange(pieces
                    .Where(piece => piece.Amount != 0m && Shown(piece.Date))
                    .Select(piece => new SpreadSlice(row.Id, piece.Date, FlowType.Expense, row.CategoryId, row.PayeeKey, row.Place, row.TagIds, piece.Amount)));
            }
            else if (part.Household && mine != 0m && Shown(part.Date))
            {
                var category = row.CategoryId is { } id && categories.Contains(id) ? id : (CategoryId?)null;
                slices.Add(new SpreadSlice(row.Id, part.Date, FlowType.Expense, category, null, null, [], mine));
            }
        }

        return slices;
    }

    private sealed record Part(TransactionId TransactionId, DateOnly Date, decimal Share, bool Household);
}
