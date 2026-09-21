using System.Linq.Expressions;
using FastEndpoints;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.InvestmentCashFlows;

[RegisterService<IInvestmentCashFlowService>(LifeTime.Scoped)]
public sealed class InvestmentCashFlowService(AppDbContext db, IInstanceSettingsStore settings)
    : IInvestmentCashFlowService
{
    private static readonly InvestmentTransactionType[] IncomeTypes =
    [
        InvestmentTransactionType.Dividend,
        InvestmentTransactionType.Interest,
    ];

    private static readonly InvestmentTransactionType[] ExpenseTypes =
    [
        InvestmentTransactionType.WithholdingTax,
        InvestmentTransactionType.Fee,
    ];

    public async Task<IReadOnlyList<InvestmentCashFlow>> GetFlowsAsync(
        DateWindow window,
        DateWindow? comparison,
        CancellationToken cancellationToken)
    {
        if (!settings.Current.IsEnabled(Feature.Investments))
        {
            return [];
        }

        var rows = await db.InvestmentTransactions
            .AsNoTracking()
            .Where(Within(window, comparison))
            .Where(t => IncomeTypes.Contains(t.Type) || ExpenseTypes.Contains(t.Type))
            .GroupBy(t => new { t.Date, t.Type })
            .Select(g => new { g.Key.Date, g.Key.Type, Total = g.Sum(t => t.ReportingAmount) })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(r => new { r.Date, IsIncome = IncomeTypes.Contains(r.Type) })
            .Select(g => g.Key.IsIncome
                ? new InvestmentCashFlow(g.Key.Date, FlowType.Income, g.Sum(r => r.Total))
                : new InvestmentCashFlow(g.Key.Date, FlowType.Expense, -g.Sum(r => r.Total)))
            .ToList();
    }

    private static Expression<Func<InvestmentTransaction, bool>> Within(DateWindow window, DateWindow? comparison) =>
        comparison is { } other
            ? t => (t.Date >= window.Start && t.Date < window.ExclusiveEnd)
                || (t.Date >= other.Start && t.Date < other.ExclusiveEnd)
            : t => t.Date >= window.Start && t.Date < window.ExclusiveEnd;
}
