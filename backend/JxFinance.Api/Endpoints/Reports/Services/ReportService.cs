using FastEndpoints;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Dashboard.Shared;
using JxFinance.Endpoints.Reports.Interfaces;
using JxFinance.Endpoints.Reports.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Reports.Services;

[RegisterService<IReportService>(LifeTime.Scoped)]
public sealed class ReportService(AppDbContext db, IClock clock, ICategoryAttributionService attributions) : IReportService
{
    public async Task<ReportSummaryResponse> GetSummaryAsync(
        DateOnly? dateFrom,
        DateOnly? dateTo,
        CancellationToken cancellationToken)
    {
        var nowLocal = clock.Today;
        var periodEnd = dateTo ?? nowLocal;
        var periodStart = dateFrom ?? new DateOnly(periodEnd.Year, periodEnd.Month, 1);
        var exclusiveEnd = periodEnd.AddDays(1);

        var totals = await db.Transactions
            .Where(t => t.Date >= periodStart && t.Date < exclusiveEnd)
            .GroupBy(t => t.Type)
            .Select(g => new { Type = g.Key, Total = g.Sum(t => t.ReportingAmount) })
            .ToListAsync(cancellationToken);

        var totalIncome = totals.FirstOrDefault(t => t.Type == FlowType.Income)?.Total ?? 0m;
        var totalExpense = totals.FirstOrDefault(t => t.Type == FlowType.Expense)?.Total ?? 0m;

        var expenseAttributions = await attributions.GetAttributionsAsync(
            periodStart,
            exclusiveEnd,
            FlowType.Expense,
            cancellationToken);

        var categories = await db.Categories.ToDictionaryAsync(c => c.Id, cancellationToken);

        var expenseByCategory = expenseAttributions
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

        var (trend, bucket) = await BuildTrendAsync(periodStart, exclusiveEnd, cancellationToken);

        return new ReportSummaryResponse(
            periodStart,
            periodEnd,
            totalIncome,
            totalExpense,
            totalIncome - totalExpense,
            expenseByCategory,
            trend,
            bucket);
    }

    private async Task<(IReadOnlyList<ReportTrendPoint> Trend, string Bucket)> BuildTrendAsync(
        DateOnly periodStart,
        DateOnly exclusiveEnd,
        CancellationToken cancellationToken)
    {
        var spanDays = exclusiveEnd.DayNumber - periodStart.DayNumber;
        var monthly = spanDays > 62;

        var raw = await db.Transactions
            .Where(t => t.Date >= periodStart && t.Date < exclusiveEnd)
            .Select(t => new { t.Date, t.Type, Amount = t.ReportingAmount })
            .ToListAsync(cancellationToken);

        var points = new List<ReportTrendPoint>();
        if (monthly)
        {
            var cursor = new DateOnly(periodStart.Year, periodStart.Month, 1);
            while (cursor < exclusiveEnd)
            {
                var next = cursor.AddMonths(1);
                var income = raw.Where(t => t.Type == FlowType.Income && t.Date >= cursor && t.Date < next).Sum(t => t.Amount);
                var expense = raw.Where(t => t.Type == FlowType.Expense && t.Date >= cursor && t.Date < next).Sum(t => t.Amount);
                points.Add(new ReportTrendPoint(cursor, income, expense));
                cursor = next;
            }

            return (points, "month");
        }

        var day = periodStart;
        while (day < exclusiveEnd)
        {
            var income = raw.Where(t => t.Type == FlowType.Income && t.Date == day).Sum(t => t.Amount);
            var expense = raw.Where(t => t.Type == FlowType.Expense && t.Date == day).Sum(t => t.Amount);
            points.Add(new ReportTrendPoint(day, income, expense));
            day = day.AddDays(1);
        }

        return (points, "day");
    }
}
