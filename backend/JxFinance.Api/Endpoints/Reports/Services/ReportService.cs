using FastEndpoints;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Common.InvestmentCashFlows;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Dashboard.Shared;
using JxFinance.Endpoints.Reports.Interfaces;
using JxFinance.Endpoints.Reports.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Reports.Services;

[RegisterService<IReportService>(LifeTime.Scoped)]
public sealed class ReportService(
    AppDbContext db,
    IClock clock,
    ICategoryAttributionService attributions,
    IInvestmentCashFlowService investmentCashFlows) : IReportService
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

        var flows = await ReadTransactionFlowsAsync(period, earlier, cancellationToken);
        var investmentFlows = await investmentCashFlows.GetFlowsAsync(period, earlier, cancellationToken);

        var expenseAttributions = await attributions.GetAttributionsAsync(
            periodStart,
            exclusiveEnd,
            FlowType.Expense,
            cancellationToken);

        var categories = await db.Categories.ToDictionaryAsync(c => c.Id, cancellationToken);

        var expenseByCategory = CategoryBreakdownBuilder.Build(
            expenseAttributions.Where(a => period.Contains(a.Date)),
            categories,
            investmentFlows.Where(f => period.Contains(f.Date)),
            FlowType.Expense,
            earlier is null ? null : expenseAttributions.Where(a => earlier.Value.Contains(a.Date)),
            earlier is null ? null : investmentFlows.Where(f => earlier.Value.Contains(f.Date)));
        var incomeByCategory = CategoryBreakdownBuilder.Build(
            incomeAttributions.Where(a => period.Contains(a.Date)),
            categories,
            investmentFlows.Where(f => period.Contains(f.Date)),
            FlowType.Income,
            earlier is null ? null : incomeAttributions.Where(a => earlier.Value.Contains(a.Date)),
            earlier is null ? null : investmentFlows.Where(f => earlier.Value.Contains(f.Date)));

        var everything = flows
            .Concat(investmentFlows.Select(f => new DatedFlow(f.Date, f.Type, f.Amount)))
            .ToList();

        var (trend, bucket) = await BuildTrendAsync(periodStart, exclusiveEnd, cancellationToken);

        return new ReportSummaryResponse(
            periodStart,
            periodEnd,
            totalIncome,
            totalExpense,
            totalIncome - totalExpense,
            expenseByCategory,
            incomeByCategory,
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
