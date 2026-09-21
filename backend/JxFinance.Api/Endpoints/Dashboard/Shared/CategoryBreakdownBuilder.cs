using JxFinance.Common.CategoryAttributions;
using JxFinance.Common.InvestmentCashFlows;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Dashboard.Shared;

public static class CategoryBreakdownBuilder
{
    public static IReadOnlyList<CategoryBreakdownItem> Build(
        IEnumerable<CategoryAttribution> attributions,
        IReadOnlyDictionary<CategoryId, Category> categories,
        IEnumerable<InvestmentCashFlow> investmentFlows,
        FlowType type,
        IEnumerable<CategoryAttribution>? comparisonAttributions = null,
        IEnumerable<InvestmentCashFlow>? comparisonFlows = null)
    {
        var current = Totals(attributions);
        var earlier = comparisonAttributions is null ? null : Totals(comparisonAttributions);

        var keys = earlier is null
            ? current.Select(entry => entry.Key)
            : current.Select(entry => entry.Key).Union(earlier.Select(entry => entry.Key));

        var items = keys.Select(key =>
        {
            var category = key.HasValue ? categories.GetValueOrDefault(key.Value) : null;
            return new CategoryBreakdownItem(
                key?.Value,
                category?.Name ?? "Uncategorized",
                category?.Icon,
                Money.Round(AmountOf(current, key)),
                null,
                earlier is null ? null : Money.Round(AmountOf(earlier, key)));
        }).ToList();

        var investmentTotal = Money.Round(investmentFlows.Where(f => f.Type == type).Sum(f => f.Amount));
        var earlierInvestmentTotal = comparisonFlows is null
            ? null
            : (decimal?)Money.Round(comparisonFlows.Where(f => f.Type == type).Sum(f => f.Amount));

        if (investmentTotal > 0m || earlierInvestmentTotal > 0m)
        {
            items.Add(type == FlowType.Income
                ? new CategoryBreakdownItem(null, "Investment income", "coins", investmentTotal, SyntheticCategoryGroup.InvestmentIncome, earlierInvestmentTotal)
                : new CategoryBreakdownItem(null, "Investment taxes and fees", "banknote", investmentTotal, SyntheticCategoryGroup.InvestmentTaxesAndFees, earlierInvestmentTotal));
        }

        return items.OrderByDescending(Weight).ToList();
    }

    private static List<(CategoryId? Key, decimal Amount)> Totals(IEnumerable<CategoryAttribution> attributions) =>
        attributions
            .GroupBy(a => a.CategoryId)
            .Select(g => (g.Key, g.Sum(a => a.Amount)))
            .ToList();

    private static decimal AmountOf(List<(CategoryId? Key, decimal Amount)> totals, CategoryId? key) =>
        totals.FirstOrDefault(entry => entry.Key == key).Amount;

    private static decimal Weight(CategoryBreakdownItem item) =>
        item.ComparisonAmount is { } earlier ? Math.Max(item.Amount, earlier) : item.Amount;
}
