using JxFinance.Common.Spreads;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;

namespace JxFinance.Common.CategoryAttributions;

public interface ICategoryAttributionService
{
    Task<IReadOnlyList<CategoryAttribution>> GetAttributionsAsync(
        DateWindow window,
        DateWindow? comparison,
        FlowType type,
        IReadOnlyList<SpreadSlice> shares,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<CategoryAttribution>> GetAttributionsAsync(
        DateWindow window,
        HouseholdId household,
        FlowType type,
        CancellationToken cancellationToken);
}
