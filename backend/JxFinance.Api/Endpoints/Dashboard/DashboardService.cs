using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Dashboard;

public sealed class DashboardService(AppDbContext db, IClock clock) : IDashboardService
{
    public async Task<DashboardSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken)
    {
        var nowLocal = clock.ToAppTime(clock.UtcNow);
        var monthStart = new DateOnly(nowLocal.Year, nowLocal.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var startingBalances = await db.Accounts.SumAsync(a => (decimal)a.StartingBalance, cancellationToken);
        var activeAccountIds = db.Accounts.Select(a => a.Id);
        var netMovement = await db.Transactions
            .Where(t => activeAccountIds.Contains(t.AccountId))
            .SumAsync(t => t.Type == FlowType.Income ? (decimal)t.Amount : -(decimal)t.Amount, cancellationToken);

        var monthTotals = await db.Transactions
            .Where(t => t.Date >= monthStart && t.Date < monthEnd)
            .GroupBy(t => t.Type)
            .Select(g => new { Type = g.Key, Total = g.Sum(t => (decimal)t.Amount) })
            .ToListAsync(cancellationToken);

        var monthIncome = monthTotals.FirstOrDefault(t => t.Type == FlowType.Income)?.Total ?? 0m;
        var monthExpense = monthTotals.FirstOrDefault(t => t.Type == FlowType.Expense)?.Total ?? 0m;

        return new DashboardSummaryResponse(
            MoneyWire.ToWire(new Money(startingBalances + netMovement)),
            MoneyWire.ToWire(new Money(monthIncome)),
            MoneyWire.ToWire(new Money(monthExpense)),
            monthStart,
            monthEnd.AddDays(-1));
    }
}
