using JxFinance.Domain.Common;
using JxFinance.Domain.Goals;

namespace JxFinance.Endpoints.Goals.Interfaces;

public interface IGoalService
{
    Task<IReadOnlyList<Goal>> GetAllAsync(CancellationToken cancellationToken);

    Task<Goal> CreateAsync(Goal goal, CancellationToken cancellationToken);

    Task<Result<Goal>> UpdateAsync(Guid id, Action<Goal> apply, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
