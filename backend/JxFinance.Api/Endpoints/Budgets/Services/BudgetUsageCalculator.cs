using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Common.Settings;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.Services;

[RegisterService<IBudgetUsageCalculator>(LifeTime.Scoped)]
public sealed class BudgetUsageCalculator(
    ICategoryAttributionService attributions,
    IInstanceSettingsStore settings,
    IClock clock) : IBudgetUsageCalculator
{
    public async Task<IReadOnlyDictionary<BudgetId, BudgetUsage>> CalculateAsync(
        IReadOnlyList<Budget> budgets,
        CancellationToken cancellationToken)
    {
        if (budgets.Count == 0)
        {
            return new Dictionary<BudgetId, BudgetUsage>();
        }

        var firstDayOfWeek = settings.Current.FirstDayOfWeek;
        var today = clock.Today;
        var walks = budgets.ToDictionary(b => b.Id, b => Walk(b, today, firstDayOfWeek));

        var spanStart = walks.Values.Min(windows => windows[0].Start);
        var spanEnd = walks.Values.Max(windows => windows[^1].End);

        var spendByCategory = (await attributions.GetAttributionsAsync(
                new DateWindow(spanStart, spanEnd),
                null,
                FlowType.Expense,
                cancellationToken))
            .Where(a => a.CategoryId.HasValue)
            .GroupBy(a => a.CategoryId!.Value)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<CategoryAttribution>)[.. g]);

        return budgets.ToDictionary(
            b => b.Id,
            b => Usage(b, walks[b.Id], spendByCategory.GetValueOrDefault(b.CategoryId, [])));
    }

    private List<BudgetWindow> Walk(Budget budget, DateOnly today, FirstDayOfWeek firstDayOfWeek)
    {
        var current = BudgetWindow.For(today, budget.Period, firstDayOfWeek);
        if (!budget.RolloverEnabled)
        {
            return [current];
        }

        var createdOn = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(budget.CreatedAt, clock.TimeZone).DateTime);
        var earliest = BudgetWindow.For(createdOn, budget.Period, firstDayOfWeek).Start;

        var windows = new List<BudgetWindow>();
        for (var back = BudgetWindow.MaxCarryWindows; back > 0; back--)
        {
            var window = current.Shift(-back);
            if (window.Start >= earliest)
            {
                windows.Add(window);
            }
        }

        windows.Add(current);
        return windows;
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

    private static decimal SpentIn(BudgetWindow window, IReadOnlyList<CategoryAttribution> spend) =>
        Money.Round(spend.Where(a => window.Contains(a.Date)).Sum(a => a.Amount));
}
