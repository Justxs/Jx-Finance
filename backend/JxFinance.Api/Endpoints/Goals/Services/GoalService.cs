using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Domain.Goals;
using JxFinance.Endpoints.Goals.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Goals.Services;

[RegisterService<IGoalService>(LifeTime.Scoped)]
public sealed class GoalService(AppDbContext db) : IGoalService
{
    private const string NotFound = "Goal not found.";

    public async Task<IReadOnlyList<Goal>> GetAllAsync(CancellationToken cancellationToken) =>
        await db.Goals.OrderBy(g => g.CreatedAt).ToListAsync(cancellationToken);

    public async Task<Goal> CreateAsync(Goal goal, CancellationToken cancellationToken)
    {
        db.Goals.Add(goal);
        await db.SaveChangesAsync(cancellationToken);

        return goal;
    }

    public Task<Result<Goal>> UpdateAsync(Guid id, Action<Goal> apply, CancellationToken cancellationToken)
    {
        var goalId = new GoalId(id);
        return db.UpdateOrNotFoundAsync(g => g.Id == goalId, NotFound, apply, cancellationToken);
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var goalId = new GoalId(id);
        return db.DeleteOrNotFoundAsync<Goal>(id, g => g.Id == goalId, NotFound, cancellationToken);
    }
}
