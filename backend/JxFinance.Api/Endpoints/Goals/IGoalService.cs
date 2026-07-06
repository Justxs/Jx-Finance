using JxFinance.Domain.Common;
using JxFinance.Endpoints.Goals.CreateGoal;
using JxFinance.Endpoints.Goals.UpdateGoal;

namespace JxFinance.Endpoints.Goals;

public interface IGoalService
{
    Task<IReadOnlyList<GoalResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<GoalResponse> CreateAsync(CreateGoalRequest request, CancellationToken cancellationToken);

    Task<Result<GoalResponse>> UpdateAsync(UpdateGoalRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
