using JxFinance.Domain.Common;
using JxFinance.Endpoints.Budgets.CreateBudget;
using JxFinance.Endpoints.Budgets.UpdateBudget;

namespace JxFinance.Endpoints.Budgets;

public interface IBudgetService
{
    Task<IReadOnlyList<BudgetResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<BudgetResponse>> CreateAsync(CreateBudgetRequest request, CancellationToken cancellationToken);

    Task<Result<BudgetResponse>> UpdateAsync(UpdateBudgetRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
