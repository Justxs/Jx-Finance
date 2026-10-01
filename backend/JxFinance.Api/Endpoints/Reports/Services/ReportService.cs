using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Common.InvestmentCashFlows;
using JxFinance.Common.Payees;
using JxFinance.Common.Places;
using JxFinance.Common.Settings;
using JxFinance.Common.SettleUp;
using JxFinance.Common.Spreads;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
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
    ICurrentUser currentUser,
    ICategoryAttributionService attributions,
    IInvestmentCashFlowService investmentCashFlows,
    IInstanceSettingsStore settings) : IReportService
{
    private sealed record Bucket(DateOnly Start, decimal Income, decimal Expense);

    public async Task<ReportSummaryResponse> GetSummaryAsync(
        DateOnly? dateFrom,
        DateOnly? dateTo,
        ReportComparisonMode comparison,
        SpendingShare share,
        CancellationToken cancellationToken)
    {
        var nowLocal = clock.Today;
        var periodEnd = dateTo ?? nowLocal;
        var periodStart = dateFrom ?? DateWindow.MonthOf(periodEnd).Start;
        var period = DateWindow.Inclusive(periodStart, periodEnd);
        var earlier = ComparisonWindow.For(comparison, period);

        var investmentFlows = await investmentCashFlows.GetFlowsAsync(period, earlier, cancellationToken);
        var shares = await ShareSlices.OfAsync(db, currentUser.Id, share, period, earlier, cancellationToken);

        var expenseAttributions = await attributions.GetAttributionsAsync(period, earlier, FlowType.Expense, shares, cancellationToken);
        var incomeAttributions = await attributions.GetAttributionsAsync(period, earlier, FlowType.Income, shares, cancellationToken);

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

        List<DatedFlow> everything = [.. await db.Transactions.DailyFlowsAsync(period, earlier, shares, cancellationToken), .. investmentFlows];

        var (trend, trendBucket) = BuildTrend(everything, period, earlier);
        var expenseSlices = (await db.Transactions.SlicesAsync(period, earlier, cancellationToken))
            .Where(slice => slice.Type == FlowType.Expense)
            .ToList();
        var expenseByTag = await BuildTagBreakdownAsync(period, earlier, [.. expenseSlices, .. shares], cancellationToken);
        var expenseByPayee = await BuildPayeeBreakdownAsync(period, earlier, expenseSlices, shares, cancellationToken);
        var expenseByPlace = settings.Current.IsEnabled(Feature.Locations)
            ? await BuildPlaceBreakdownAsync(period, earlier, expenseSlices, shares, cancellationToken)
            : [];

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
            expenseByPayee,
            expenseByPlace,
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
        flows.Where(f => window.Contains(f.Date)).Totals();

    private async Task<IReadOnlyList<TagBreakdownItem>> BuildTagBreakdownAsync(
        DateWindow period,
        DateWindow? comparison,
        IReadOnlyList<SpreadSlice> slices,
        CancellationToken cancellationToken)
    {
        var start = period.Start;
        var end = period.ExclusiveEnd;
        var expenses = db.Transactions.Within(period, comparison).Where(t => t.Type == FlowType.Expense && t.SpreadMonths == null);

        var tagged = (await expenses
            .SelectMany(t => db.TransactionTags
                .Where(x => x.TransactionId == t.Id)
                .Select(x => new { x.TagId, t.ReportingAmount, Current = t.Date >= start && t.Date < end }))
            .GroupBy(pair => new { pair.TagId, pair.Current })
            .Select(group => new { group.Key.TagId, group.Key.Current, Amount = group.Sum(pair => pair.ReportingAmount) })
            .ToListAsync(cancellationToken))
            .Select(entry => (entry.TagId, entry.Current, entry.Amount))
            .Concat(slices.SelectMany(slice => slice.TagIds.Select(tagId => (TagId: tagId, Current: period.Contains(slice.Date), slice.Amount))))
            .ToList();

        var untagged = (await expenses
            .Where(t => !db.TransactionTags.Any(x => x.TransactionId == t.Id))
            .GroupBy(t => t.Date >= start && t.Date < end)
            .Select(group => new { Current = group.Key, Amount = group.Sum(t => t.ReportingAmount) })
            .ToListAsync(cancellationToken))
            .Select(entry => (entry.Current, entry.Amount))
            .Concat(slices.Where(slice => slice.TagIds.Count == 0).Select(slice => (Current: period.Contains(slice.Date), slice.Amount)))
            .ToList();

        var names = await db.Tags.Select(tag => new { Key = tag.Id, Value = tag.Name })
            .ToDictionaryAsync(x => x.Key, x => x.Value, cancellationToken);

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

    private async Task<IReadOnlyList<PayeeBreakdownItem>> BuildPayeeBreakdownAsync(
        DateWindow period,
        DateWindow? comparison,
        IReadOnlyList<SpreadSlice> slices,
        IReadOnlyList<SpreadSlice> shares,
        CancellationToken cancellationToken)
    {
        var start = period.Start;
        var end = period.ExclusiveEnd;
        var expenses = db.Transactions.Within(period, comparison).Where(t => t.Type == FlowType.Expense);

        var grouped = (await expenses
            .Where(t => t.SpreadMonths == null)
            .GroupBy(t => new { t.PayeeKey, Current = t.Date >= start && t.Date < end })
            .Select(group => new
            {
                group.Key.PayeeKey,
                group.Key.Current,
                Amount = group.Sum(t => t.ReportingAmount),
                Count = group.Count(),
            })
            .ToListAsync(cancellationToken))
            .Select(entry => (entry.PayeeKey, entry.Current, entry.Amount, entry.Count))
            .Concat(slices
                .GroupBy(slice => (slice.PayeeKey, Current: period.Contains(slice.Date)))
                .Select(group => (group.Key.PayeeKey, group.Key.Current, Amount: group.Sum(slice => slice.Amount), Count: group.Select(slice => slice.Id).Distinct().Count())))
            .Concat(shares.Select(slice => (slice.PayeeKey, Current: period.Contains(slice.Date), slice.Amount, Count: 0)))
            .ToList();

        var totals = grouped
            .GroupBy(entry => entry.PayeeKey ?? string.Empty)
            .Select(group => new
            {
                group.Key,
                Amount = Money.Round(group.Where(entry => entry.Current).Sum(entry => entry.Amount)),
                Earlier = comparison is null
                    ? null
                    : (decimal?)Money.Round(group.Where(entry => !entry.Current).Sum(entry => entry.Amount)),
                Count = group.Where(entry => entry.Current).Sum(entry => entry.Count),
            })
            .OrderByDescending(item => item.Earlier is { } earlier ? Math.Max(item.Amount, earlier) : item.Amount)
            .ThenBy(item => item.Key, StringComparer.Ordinal)
            .Take(PayeeBreakdownItem.MaxItems)
            .ToList();

        var keys = totals.Select(item => item.Key).Where(key => key.Length > 0).ToList();
        var spreadIds = slices.Select(slice => slice.Id).Distinct().ToList();
        var labels = await db.Transactions
            .Where(t => t.Type == FlowType.Expense && keys.Contains(t.PayeeKey!))
            .Where(t => spreadIds.Contains(t.Id) || expenses.Any(e => e.Id == t.Id))
            .GroupBy(t => t.PayeeKey!)
            .Select(group => new
            {
                group.Key,
                Label = group
                    .OrderByDescending(t => t.Date)
                    .ThenByDescending(t => t.CreatedAt)
                    .Select(t => t.Description)
                    .FirstOrDefault(),
            })
            .ToDictionaryAsync(entry => entry.Key, entry => entry.Label, cancellationToken);
        var names = await db.PayeeNamesForAsync(keys, cancellationToken);

        return totals
            .Select(item => item.Key.Length == 0
                ? new PayeeBreakdownItem(null, null, item.Amount, item.Earlier, item.Count)
                : new PayeeBreakdownItem(item.Key, labels.GetValueOrDefault(item.Key), item.Amount, item.Earlier, item.Count)
                {
                    Name = names.GetValueOrDefault(item.Key),
                })
            .ToList();
    }

    private async Task<IReadOnlyList<PlaceBreakdownItem>> BuildPlaceBreakdownAsync(
        DateWindow period,
        DateWindow? comparison,
        IReadOnlyList<SpreadSlice> slices,
        IReadOnlyList<SpreadSlice> shares,
        CancellationToken cancellationToken)
    {
        var start = period.Start;
        var end = period.ExclusiveEnd;
        var expenses = db.Transactions.Within(period, comparison).Where(t => t.Type == FlowType.Expense);

        var grouped = (await expenses
            .Where(t => t.SpreadMonths == null)
            .GroupBy(t => new { t.Place, Current = t.Date >= start && t.Date < end })
            .Select(group => new
            {
                group.Key.Place,
                group.Key.Current,
                Amount = group.Sum(t => t.ReportingAmount),
                Count = group.Count(),
            })
            .ToListAsync(cancellationToken))
            .Select(entry => (entry.Place, entry.Current, entry.Amount, entry.Count))
            .Concat(slices
                .GroupBy(slice => (slice.Place, Current: period.Contains(slice.Date)))
                .Select(group => (group.Key.Place, group.Key.Current, Amount: group.Sum(slice => slice.Amount), Count: group.Select(slice => slice.Id).Distinct().Count())))
            .Concat(shares.Select(slice => (slice.Place, Current: period.Contains(slice.Date), slice.Amount, Count: 0)))
            .ToList();

        var totals = grouped
            .GroupBy(entry => entry.Place is { } place ? PlaceSpellings.KeyOf(place) : string.Empty)
            .Select(group => new
            {
                group.Key,
                Amount = Money.Round(group.Where(entry => entry.Current).Sum(entry => entry.Amount)),
                Earlier = comparison is null
                    ? null
                    : (decimal?)Money.Round(group.Where(entry => !entry.Current).Sum(entry => entry.Amount)),
                Count = group.Where(entry => entry.Current).Sum(entry => entry.Count),
            })
            .OrderByDescending(item => item.Earlier is { } earlier ? Math.Max(item.Amount, earlier) : item.Amount)
            .ThenBy(item => item.Key, StringComparer.Ordinal)
            .Take(PlaceBreakdownItem.MaxItems)
            .ToList();

        var spreadIds = slices.Select(slice => slice.Id).Distinct().ToList();
        var places = PlaceSpellings.Fold(await db.Transactions
                .Where(t => t.Type == FlowType.Expense)
                .Where(t => spreadIds.Contains(t.Id) || expenses.Any(e => e.Id == t.Id))
                .SpellingsAsync(cancellationToken))
            .ToDictionary(place => place.Key);

        return totals
            .Select(item => places.GetValueOrDefault(item.Key) is { } place
                ? new PlaceBreakdownItem(place.Name, item.Amount, item.Earlier, item.Count, place.Latitude, place.Longitude)
                : new PlaceBreakdownItem(null, item.Amount, item.Earlier, item.Count, null, null))
            .ToList();
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
        var byBucket = flows.Where(f => window.Contains(f.Date)).ToLookup(f => monthly ? DateWindow.MonthOf(f.Date).Start : f.Date);

        while (cursor < window.ExclusiveEnd)
        {
            var next = monthly ? cursor.AddMonths(1) : cursor.AddDays(1);
            var (income, expense) = byBucket[cursor].Totals();
            buckets.Add(new Bucket(cursor, income, expense));
            cursor = next;
        }

        return buckets;
    }
}
