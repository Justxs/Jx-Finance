using System.Globalization;
using FastEndpoints;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Dashboard.Services;

[RegisterService<IDashboardService>(LifeTime.Scoped)]
public sealed class DashboardService(
    AppDbContext db,
    IClock clock,
    ICategoryAttributionService attributions,
    IAccountService accountService)
    : IDashboardService
{
    public async Task<DashboardSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken)
    {
        var nowLocal = clock.Today;
        var monthStart = new DateOnly(nowLocal.Year, nowLocal.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var (totalBalance, _) = await accountService.GetReportingTotalAsync(cancellationToken);

        var monthTotals = await db.Transactions
            .Where(t => t.Date >= monthStart && t.Date < monthEnd)
            .GroupBy(t => t.Type)
            .Select(g => new { Type = g.Key, Total = g.Sum(t => t.ReportingAmount) })
            .ToListAsync(cancellationToken);

        var monthIncome = monthTotals.FirstOrDefault(t => t.Type == FlowType.Income)?.Total ?? 0m;
        var monthExpense = monthTotals.FirstOrDefault(t => t.Type == FlowType.Expense)?.Total ?? 0m;

        return new DashboardSummaryResponse(
            totalBalance,
            monthIncome,
            monthExpense,
            monthStart,
            monthEnd.AddDays(-1));
    }

    public async Task<CategoryBreakdownResponse> GetCategoryBreakdownAsync(
        string? month,
        CancellationToken cancellationToken)
    {
        var nowLocal = clock.Today;
        var (periodStart, periodEnd) = ResolveMonth(month, nowLocal);

        var categoryAttributions = await attributions.GetAttributionsAsync(
            periodStart,
            periodEnd,
            FlowType.Expense,
            cancellationToken);

        var categories = await db.Categories.ToDictionaryAsync(c => c.Id, cancellationToken);

        var items = categoryAttributions
            .GroupBy(a => a.CategoryId)
            .Select(g =>
            {
                var category = g.Key.HasValue ? categories.GetValueOrDefault(g.Key.Value) : null;
                return new CategoryBreakdownItem(
                    g.Key?.Value,
                    category?.Name ?? "Uncategorized",
                    category?.Icon,
                    Money.Round(g.Sum(a => a.Amount)));
            })
            .OrderByDescending(i => i.Amount)
            .ToList();

        return new CategoryBreakdownResponse(items, periodStart, periodEnd.AddDays(-1));
    }

    public async Task<MonthlyTrendResponse> GetMonthlyTrendAsync(int months, CancellationToken cancellationToken)
    {
        var clamped = Math.Clamp(months, 1, 24);
        var nowLocal = clock.Today;
        var currentMonthStart = new DateOnly(nowLocal.Year, nowLocal.Month, 1);
        var earliestStart = currentMonthStart.AddMonths(-(clamped - 1));

        var totals = await db.Transactions
            .Where(t => t.Date >= earliestStart && t.Date < currentMonthStart.AddMonths(1))
            .GroupBy(t => new { t.Date.Year, t.Date.Month, t.Type })
            .Select(g => new { g.Key.Year, g.Key.Month, g.Key.Type, Total = g.Sum(t => t.ReportingAmount) })
            .ToListAsync(cancellationToken);

        var items = new List<MonthlyTrendItem>();
        for (var i = 0; i < clamped; i++)
        {
            var monthStart = earliestStart.AddMonths(i);
            var income = totals
                .FirstOrDefault(t => t.Year == monthStart.Year && t.Month == monthStart.Month && t.Type == FlowType.Income)
                ?.Total ?? 0m;
            var expense = totals
                .FirstOrDefault(t => t.Year == monthStart.Year && t.Month == monthStart.Month && t.Type == FlowType.Expense)
                ?.Total ?? 0m;

            items.Add(new MonthlyTrendItem(
                monthStart.Year,
                monthStart.Month,
                income,
                expense));
        }

        return new MonthlyTrendResponse(items);
    }

    private static (DateOnly Start, DateOnly End) ResolveMonth(string? month, DateOnly fallbackToday)
    {
        DateOnly start;
        if (!string.IsNullOrWhiteSpace(month)
            && DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            start = new DateOnly(parsed.Year, parsed.Month, 1);
        }
        else
        {
            start = new DateOnly(fallbackToday.Year, fallbackToday.Month, 1);
        }

        return (start, start.AddMonths(1));
    }
}
