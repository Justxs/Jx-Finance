using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Common.Settings;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Common;
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
        var spendByCategory = budgets.Any(b => b.CategoryId is not null)
            ? (await attributions.GetAttributionsAsync(span, null, FlowType.Expense, cancellationToken))
                .Where(a => a.CategoryId.HasValue)
                .GroupBy(a => a.CategoryId!.Value)
                .ToDictionary(g => g.Key, g => (IReadOnlyList<CategoryAttribution>)[.. g])
            : [];
        var spendByTag = await TagSpendAsync(budgets, span, cancellationToken);

        return budgets.ToDictionary(
            b => b.Id,
            b => Usage(b, walks[b.Id], b.TagId is { } tagId
                ? spendByTag.GetValueOrDefault(tagId, [])
                : spendByCategory.GetValueOrDefault(b.CategoryId!.Value, [])));
    }

    private async Task<Dictionary<TagId, IReadOnlyList<CategoryAttribution>>> TagSpendAsync(
        IReadOnlyList<Budget> budgets,
        DateWindow span,
        CancellationToken cancellationToken)
    {
        var tagIds = budgets.Select(b => b.TagId).OfType<TagId>().Distinct().ToList();
        if (tagIds.Count == 0)
        {
            return [];
        }

        var rows = await db.TransactionTags
            .Where(x => tagIds.Contains(x.TagId))
            .Join(
                db.Transactions.Where(t => t.Type == FlowType.Expense && t.Date >= span.Start && t.Date < span.ExclusiveEnd),
                x => x.TransactionId,
                t => t.Id,
                (x, t) => new { x.TagId, t.Date, t.ReportingAmount })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.TagId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<CategoryAttribution>)[.. g.Select(row => new CategoryAttribution(row.Date, null, row.ReportingAmount))]);
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
