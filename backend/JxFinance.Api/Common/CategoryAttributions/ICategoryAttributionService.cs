using JxFinance.Domain.Common;

namespace JxFinance.Common.CategoryAttributions;

public interface ICategoryAttributionService
{
    Task<IReadOnlyList<CategoryAttribution>> GetAttributionsAsync(
        DateOnly start,
        DateOnly end,
        FlowType type,
        CancellationToken cancellationToken);
}
