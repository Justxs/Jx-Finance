using JxFinance.Domain.Common;
using JxFinance.Endpoints.Goals.CreateGoal;
using JxFinance.Endpoints.Goals.Shared;
using JxFinance.Endpoints.Goals.UpdateGoal;

namespace JxFinance.Endpoints.Goals.Interfaces;

public interface IGoalService
{
    Task<IReadOnlyList<GoalResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<GoalResponse>> CreateAsync(CreateGoalRequest request, CancellationToken cancellationToken);

    Task<Result<GoalResponse>> UpdateAsync(UpdateGoalRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
