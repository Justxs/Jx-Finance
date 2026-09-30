using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Common.Settings;
using JxFinance.Common.Spreads;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Tags;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Endpoints.Budgets.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Budgets.Services;

[RegisterService<IBudgetUsageCalculator>(LifeTime.Scoped)]
public sealed class BudgetUsageCalculator(
    AppDbContext db,
    ICategoryAttributionService attributions,
    IInstanceSettingsStore settings,
    IClock clock) : IBudgetUsageCalculator
{
    public async Task<IReadOnlyDictionary<BudgetId, BudgetUsage>> CalculateAsync(
        IReadOnlyList<Budget> budgets,
        DateOnly asOf,
        CancellationToken cancellationToken)
    {
        if (budgets.Count == 0)
        {
            return new Dictionary<BudgetId, BudgetUsage>();
        }

        var firstDayOfWeek = settings.Current.FirstDayOfWeek;
        var walks = budgets.ToDictionary(b => b.Id, b => Walk(b, asOf, firstDayOfWeek));

        var spanStart = walks.Values.Min(windows => windows[0].Start);
        var spanEnd = walks.Values.Max(windows => windows[^1].End);

        var span = new DateWindow(spanStart, spanEnd);
        var usage = new Dictionary<BudgetId, BudgetUsage>();
        foreach (var group in budgets.GroupBy(b => b.HouseholdId))
        {
            var spendByCategory = group.Any(b => b.CategoryId is not null)
                ? await CategorySpendAsync(span, group.Key, cancellationToken)
                : [];
            var spendByTag = await TagSpendAsync([.. group], span, group.Key, cancellationToken);
            foreach (var b in group)
            {
                usage[b.Id] = Usage(b, walks[b.Id], b.TagId is { } tagId
                    ? spendByTag.GetValueOrDefault(tagId, [])
                    : spendByCategory.GetValueOrDefault(b.CategoryId!.Value, []));
            }
        }

        return usage;
    }

    private async Task<Dictionary<CategoryId, IReadOnlyList<CategoryAttribution>>> CategorySpendAsync(
        DateWindow span,
        HouseholdId? household,
        CancellationToken cancellationToken)
    {
        var parents = await db.Categories
            .Where(c => c.ParentId != null)
            .ToDictionaryAsync(c => c.Id, c => c.ParentId!.Value, cancellationToken);
        var spend = household is { } shared
            ? await attributions.GetAttributionsAsync(span, shared, FlowType.Expense, cancellationToken)
            : await attributions.GetAttributionsAsync(span, null, FlowType.Expense, cancellationToken);

        return spend
            .Where(a => a.CategoryId.HasValue)
            .SelectMany(a => parents.TryGetValue(a.CategoryId!.Value, out var parent)
                ? new[] { (Key: a.CategoryId.Value, Attribution: a), (Key: parent, Attribution: a) }
                : [(Key: a.CategoryId.Value, Attribution: a)])
            .GroupBy(entry => entry.Key)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<CategoryAttribution>)[.. g.Select(entry => entry.Attribution)]);
    }

    private async Task<Dictionary<TagId, IReadOnlyList<CategoryAttribution>>> TagSpendAsync(
        IReadOnlyList<Budget> budgets,
        DateWindow span,
        HouseholdId? household,
        CancellationToken cancellationToken)
    {
        var tagIds = budgets.Select(b => b.TagId).OfType<TagId>().Distinct().ToList();
        if (tagIds.Count == 0)
        {
            return [];
        }

        var visible = db.Transactions
            .Where(t => household == null || db.Accounts.Any(a => a.Id == t.AccountId && a.HouseholdId == household));
        var rows = await db.TransactionTags
            .Where(x => tagIds.Contains(x.TagId))
            .Join(
                visible.Where(t => t.Type == FlowType.Expense
                    && t.SpreadMonths == null
                    && t.Date >= span.Start
                    && t.Date < span.ExclusiveEnd),
                x => x.TransactionId,
                t => t.Id,
                (x, t) => new { x.TagId, t.Date, t.ReportingAmount })
            .ToListAsync(cancellationToken);
        var slices = (await visible.SlicesAsync(span, null, cancellationToken))
            .Where(slice => slice.Type == FlowType.Expense)
            .SelectMany(slice => slice.TagIds
                .Where(tagIds.Contains)
                .Select(tagId => (TagId: tagId, Spend: new CategoryAttribution(slice.Date, null, slice.Amount))));

        return rows
            .Select(row => (row.TagId, Spend: new CategoryAttribution(row.Date, null, row.ReportingAmount)))
            .Concat(slices)
            .GroupBy(entry => entry.TagId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<CategoryAttribution>)[.. g.Select(entry => entry.Spend)]);
    }

    private List<BudgetWindow> Walk(Budget budget, DateOnly asOf, FirstDayOfWeek firstDayOfWeek)
    {
        var current = BudgetWindow.For(asOf, budget.Period, firstDayOfWeek);
        if (!budget.RolloverEnabled)
        {
            return [current];
        }

        var createdOn = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(budget.CreatedAt, clock.TimeZone).DateTime);
        var earliest = BudgetWindow.For(createdOn, budget.Period, firstDayOfWeek).Start;

        return [.. current.Preceding(BudgetWindow.MaxCarryWindows).Where(w => w.Start >= earliest), current];
    }

    private static BudgetUsage Usage(
        Budget budget,
        List<BudgetWindow> windows,
        IReadOnlyList<CategoryAttribution> spend)
    {
        var limit = budget.LimitAmount.Amount;
        var carried = 0m;
        for (var index = 0; index < windows.Count - 1; index++)
        {
            carried = Money.Round(limit + carried - SpentIn(windows[index], spend));
        }

        return new BudgetUsage(windows[^1], carried, SpentIn(windows[^1], spend));
    }

    public static decimal SpentIn(BudgetWindow window, IEnumerable<CategoryAttribution> spend) =>
        Money.Round(spend.Where(a => window.Contains(a.Date)).Sum(a => a.Amount));
}
