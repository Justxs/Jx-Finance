using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Common.Settings;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Endpoints.Budgets.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Budgets.Services;

[RegisterService<IBudgetSuggestionService>(LifeTime.Scoped)]
public sealed class BudgetSuggestionService(
    AppDbContext db,
    ICategoryAttributionService attributions,
    IInstanceSettingsStore settings,
    IClock clock) : IBudgetSuggestionService
{
    public async Task<BudgetSuggestionsResponse> GetAsync(BudgetPeriod period, CancellationToken cancellationToken)
    {
        var earliest = await db.Transactions.MinAsync(t => (DateOnly?)t.Date, cancellationToken);
        var windows = earliest is { } first ? WindowsSince(period, first) : [];
        if (windows.Count == 0)
        {
            return new BudgetSuggestionsResponse(period, []);
        }

        var spend = (await attributions.GetAttributionsAsync(
                new DateWindow(windows[0].Start, windows[^1].End),
                null,
                FlowType.Expense,
                cancellationToken))
            .Where(a => a.CategoryId.HasValue)
            .ToLookup(a => a.CategoryId!.Value);

        var categories = await db.Categories
            .AsNoTracking()
            .Where(c => c.Type == FlowType.Expense)
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name })
            .ToListAsync(cancellationToken);

        var budgeted = await db.Budgets
            .Where(b => b.Period == period)
            .Select(b => b.CategoryId)
            .ToListAsync(cancellationToken);

        var items = categories
            .Where(c => spend.Contains(c.Id))
            .Select(c =>
            {
                var spent = windows
                    .Select(w => new BudgetWindowSpend(
                        w.Start,
                        w.LastDay,
                        Money.Round(spend[c.Id].Where(a => w.Contains(a.Date)).Sum(a => a.Amount))))
                    .ToList();
                var amounts = spent.Select(w => w.Spent).ToList();
                return new BudgetSuggestionResponse(
                    c.Id.Value,
                    c.Name,
                    spent,
                    BudgetHistory.Median(amounts) is { } median ? Money.Round(median) : null,
                    BudgetHistory.SuggestedLimit(amounts),
                    BudgetHistory.IsSteady(amounts),
                    budgeted.Contains(c.Id));
            })
            .ToList();

        return new BudgetSuggestionsResponse(period, items);
    }

    private List<BudgetWindow> WindowsSince(BudgetPeriod period, DateOnly earliest)
    {
        var current = BudgetWindow.For(clock.Today, period, settings.Current.FirstDayOfWeek);
        return Enumerable.Range(1, BudgetHistory.Windows)
            .Reverse()
            .Select(back => current.Shift(-back))
            .Where(w => w.LastDay >= earliest)
            .ToList();
    }
}
