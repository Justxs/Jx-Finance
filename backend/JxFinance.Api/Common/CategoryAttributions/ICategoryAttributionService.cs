using JxFinance.Domain.Common;

namespace JxFinance.Common.CategoryAttributions;

public interface ICategoryAttributionService
{
    Task<IReadOnlyList<CategoryAttribution>> GetAttributionsAsync(
        DateWindow window,
        DateWindow? comparison,
        FlowType type,
        CancellationToken cancellationToken);
}
