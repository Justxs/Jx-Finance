using JxFinance.Domain.Budgets;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.Interfaces;

public interface IBudgetUsageCalculator
{
    Task<IReadOnlyDictionary<BudgetId, BudgetUsage>> CalculateAsync(
        IReadOnlyList<Budget> budgets,
        CancellationToken cancellationToken);
}
