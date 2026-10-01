using JxFinance.Common.Spreads;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common;

public static class DatedFlows
{
    public static async Task<List<DatedFlow>> DailyFlowsAsync(
        this IQueryable<Transaction> visible,
        DateWindow window,
        DateWindow? comparison,
        IReadOnlyList<SpreadSlice> shares,
        CancellationToken cancellationToken)
    {
        var flows = await visible
            .Within(window, comparison)
            .Where(t => t.SpreadMonths == null)
            .GroupBy(t => new { t.Date, t.Type })
            .Select(g => new DatedFlow(g.Key.Date, g.Key.Type, g.Sum(t => t.ReportingAmount)))
            .ToListAsync(cancellationToken);
        var slices = await visible.SlicesAsync(window, comparison, cancellationToken);

        return [.. flows, .. slices.Concat(shares).Select(slice => new DatedFlow(slice.Date, slice.Type, slice.Amount))];
    }

    public static (decimal Income, decimal Expense) Totals(this IEnumerable<DatedFlow> flows)
    {
        var income = 0m;
        var expense = 0m;
        foreach (var flow in flows)
        {
            if (flow.Type == FlowType.Income)
            {
                income += flow.Amount;
            }
            else if (flow.Type == FlowType.Expense)
            {
                expense += flow.Amount;
            }
        }

        return (income, expense);
    }
}
