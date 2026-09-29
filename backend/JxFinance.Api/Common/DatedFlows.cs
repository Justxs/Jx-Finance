using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common;

public static class DatedFlows
{
    public static Task<List<DatedFlow>> DailyFlowsAsync(this IQueryable<Transaction> transactions, CancellationToken cancellationToken) =>
        transactions
            .GroupBy(t => new { t.Date, t.Type })
            .Select(g => new DatedFlow(g.Key.Date, g.Key.Type, g.Sum(t => t.ReportingAmount)))
            .ToListAsync(cancellationToken);

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
