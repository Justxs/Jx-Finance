using JxFinance.Domain.Common;

namespace JxFinance.Common.CategoryAttributions;

/// <summary>
/// The one shared category-attribution projection: a split transaction contributes its
/// lines, an unsplit transaction contributes its own category/amount. Charts and budgets
/// both read through this so they can't drift apart (docs: TransactionLine).
/// </summary>
public interface ICategoryAttributionService
{
    Task<IReadOnlyList<CategoryAttribution>> GetAttributionsAsync(
        DateOnly start,
        DateOnly end,
        FlowType type,
        CancellationToken cancellationToken);
}
