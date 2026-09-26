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
        ReportComparisonMode comparison,
        CancellationToken cancellationToken)
    {
        var nowLocal = clock.Today;
        var periodEnd = dateTo ?? nowLocal;
        var periodStart = dateFrom ?? DateWindow.MonthOf(periodEnd).Start;
        var period = DateWindow.Inclusive(periodStart, periodEnd);
        var earlier = ComparisonWindow.For(comparison, period);

        var flows = await ReadTransactionFlowsAsync(period, earlier, cancellationToken);
        var investmentFlows = await investmentCashFlows.GetFlowsAsync(period, earlier, cancellationToken);

        var expenseAttributions = await attributions.GetAttributionsAsync(period, earlier, FlowType.Expense, cancellationToken);
        var incomeAttributions = await attributions.GetAttributionsAsync(period, earlier, FlowType.Income, cancellationToken);

        var categories = await db.Categories.ToDictionaryAsync(c => c.Id, cancellationToken);

        IReadOnlyList<CategoryBreakdownItem> Breakdown(IReadOnlyList<CategoryAttribution> attributed, FlowType type) =>
            CategoryBreakdownBuilder.Build(
                attributed.Where(a => period.Contains(a.Date)),
                categories,
                investmentFlows.Where(f => period.Contains(f.Date)),
                type,
                earlier is null ? null : attributed.Where(a => earlier.Value.Contains(a.Date)),
                earlier is null ? null : investmentFlows.Where(f => earlier.Value.Contains(f.Date)));

        var expenseByCategory = Breakdown(expenseAttributions, FlowType.Expense);
        var incomeByCategory = Breakdown(incomeAttributions, FlowType.Income);

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
            trendBucket,
            expenseByTag,
            earlier is null ? null : ComparisonTotals(comparison, earlier.Value, everything));
    }

    private static ReportComparisonTotals ComparisonTotals(
        ReportComparisonMode mode,
        DateWindow window,
        IReadOnlyList<DatedFlow> flows)
    {
        var (income, expense) = Totals(flows, window);
        return new ReportComparisonTotals(mode, window.Start, window.InclusiveEnd, income, expense, income - expense);
    }

    private static (decimal Income, decimal Expense) Totals(IEnumerable<DatedFlow> flows, DateWindow window) =>
        Sum(flows.Where(f => window.Contains(f.Date)).ToList());

    private static (decimal Income, decimal Expense) Sum(IReadOnlyList<DatedFlow> flows) => (
        flows.Where(f => f.Type == FlowType.Income).Sum(f => f.Amount),
        flows.Where(f => f.Type == FlowType.Expense).Sum(f => f.Amount));

    private async Task<IReadOnlyList<DatedFlow>> ReadTransactionFlowsAsync(
        DateWindow period,
        DateWindow? comparison,
        CancellationToken cancellationToken)
    {
        var rows = await db.Transactions
            .Where(Within(period, comparison))
            .GroupBy(t => new { t.Date, t.Type })
            .Select(g => new { g.Key.Date, g.Key.Type, Total = g.Sum(t => t.ReportingAmount) })
            .ToListAsync(cancellationToken);

        return rows.Select(r => new DatedFlow(r.Date, r.Type, r.Total)).ToList();
    }

    private async Task<IReadOnlyList<TagBreakdownItem>> BuildTagBreakdownAsync(
        DateWindow period,
        DateWindow? comparison,
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

        return items;
    }

    private static (IReadOnlyList<ReportTrendPoint> Trend, string Bucket) BuildTrend(
        IReadOnlyList<DatedFlow> flows,
        DateWindow period,
        DateWindow? comparison)
    {
        var monthly = period.Days > 62;
        var current = BucketsOf(flows, period, monthly);
        var earlier = comparison is null ? null : BucketsOf(flows, comparison.Value, monthly);

        var points = current.Select((point, index) =>
        {
            var match = earlier is null || index >= earlier.Count ? null : earlier[index];
            return new ReportTrendPoint(
                point.Start,
                point.Income,
                point.Expense,
                match?.Start,
                earlier is null ? null : match?.Income ?? 0m,
                earlier is null ? null : match?.Expense ?? 0m);
        }).ToList();

        return (points, monthly ? "month" : "day");
    }

    private static List<Bucket> BucketsOf(IReadOnlyList<DatedFlow> flows, DateWindow window, bool monthly)
    {
        var buckets = new List<Bucket>();
        var cursor = monthly ? DateWindow.MonthOf(window.Start).Start : window.Start;

        while (cursor < window.ExclusiveEnd)
        {
            var next = monthly ? cursor.AddMonths(1) : cursor.AddDays(1);
            var (income, expense) = Sum(flows.Where(f => f.Date >= cursor && f.Date < next && window.Contains(f.Date)).ToList());
            buckets.Add(new Bucket(cursor, income, expense));
            cursor = next;
        }

        return buckets;
    }

    private static Expression<Func<Transaction, bool>> Within(DateWindow window, DateWindow? comparison) =>
        comparison is { } other
            ? t => (t.Date >= window.Start && t.Date < window.ExclusiveEnd)
                || (t.Date >= other.Start && t.Date < other.ExclusiveEnd)
            : t => t.Date >= window.Start && t.Date < window.ExclusiveEnd;
}
