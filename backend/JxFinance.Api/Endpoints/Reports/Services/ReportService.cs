using System.Linq.Expressions;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Common.InvestmentCashFlows;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
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
    private sealed record DatedFlow(DateOnly Date, FlowType Type, decimal Amount);

    private sealed record Bucket(DateOnly Start, decimal Income, decimal Expense);

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
            period,
            earlier,
            FlowType.Expense,
            cancellationToken);
        var incomeAttributions = await attributions.GetAttributionsAsync(
            period,
            earlier,
            FlowType.Income,
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

        var (trend, trendBucket) = BuildTrend(everything, period, earlier);
        var expenseByTag = await BuildTagBreakdownAsync(period, earlier, cancellationToken);

        var (totalIncome, totalExpense) = Totals(everything, period);

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
        var start = period.Start;
        var end = period.ExclusiveEnd;
        var expenses = db.Transactions.Where(Within(period, comparison)).Where(t => t.Type == FlowType.Expense);

        var tagged = await expenses
            .SelectMany(t => db.TransactionTags
                .Where(x => x.TransactionId == t.Id)
                .Select(x => new { x.TagId, t.ReportingAmount, Current = t.Date >= start && t.Date < end }))
            .GroupBy(pair => new { pair.TagId, pair.Current })
            .Select(group => new { group.Key.TagId, group.Key.Current, Amount = group.Sum(pair => pair.ReportingAmount) })
            .ToListAsync(cancellationToken);

        var untagged = await expenses
            .Where(t => !db.TransactionTags.Any(x => x.TransactionId == t.Id))
            .GroupBy(t => t.Date >= start && t.Date < end)
            .Select(group => new { Current = group.Key, Amount = group.Sum(t => t.ReportingAmount) })
            .ToListAsync(cancellationToken);

        var names = await db.Tags.ToDictionaryAsync(tag => tag.Id, tag => tag.Name, cancellationToken);

        var items = tagged
            .GroupBy(entry => entry.TagId)
            .Select(group => new TagBreakdownItem(
                group.Key.Value,
                names.GetValueOrDefault(group.Key) ?? "Tag",
                Money.Round(group.Where(entry => entry.Current).Sum(entry => entry.Amount)),
                comparison is null ? null : Money.Round(group.Where(entry => !entry.Current).Sum(entry => entry.Amount))))
            .OrderByDescending(item => comparison is null
                ? item.Amount
                : Math.Max(item.Amount, item.ComparisonAmount ?? 0m))
            .ToList();

        var currentUntagged = Money.Round(untagged.Where(entry => entry.Current).Sum(entry => entry.Amount));
        var earlierUntagged = comparison is null
            ? null
            : (decimal?)Money.Round(untagged.Where(entry => !entry.Current).Sum(entry => entry.Amount));

        if (currentUntagged != 0m || earlierUntagged is not (null or 0m) || items.Count > 0)
        {
            items.Add(new TagBreakdownItem(null, "Untagged", currentUntagged, earlierUntagged));
        }

        var day = periodStart;
        while (day < exclusiveEnd)
        {
            var income = raw.Where(t => t.Type == FlowType.Income && t.Date == day).Sum(t => t.Amount);
            var expense = raw.Where(t => t.Type == FlowType.Expense && t.Date == day).Sum(t => t.Amount);
            points.Add(new ReportTrendPoint(day, income, expense));
            day = day.AddDays(1);
        }

        return buckets;
    }
}
