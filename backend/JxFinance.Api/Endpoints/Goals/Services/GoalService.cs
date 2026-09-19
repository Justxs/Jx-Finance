using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Goals;
using JxFinance.Endpoints.Goals.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Goals.Services;

[RegisterService<IGoalService>(LifeTime.Scoped)]
public sealed class GoalService(AppDbContext db) : IGoalService
{
    public async Task<IReadOnlyList<Goal>> GetAllAsync(CancellationToken cancellationToken) =>
        await db.Goals.OrderBy(g => g.CreatedAt).ToListAsync(cancellationToken);

    public async Task<Goal> CreateAsync(Goal goal, CancellationToken cancellationToken)
    {
        db.Goals.Add(goal);
        await db.SaveChangesAsync(cancellationToken);

        return goal;
    }

    public async Task<Result<Goal>> UpdateAsync(Guid id, Action<Goal> apply, CancellationToken cancellationToken)
    {
        var goalId = new GoalId(id);
        var goal = await db.Goals.FirstOrDefaultAsync(g => g.Id == goalId, cancellationToken);
        if (goal is null)
        {
            return Result<Goal>.Failure(ErrorCodes.ResourceNotFound, "Goal not found.");
        }

        apply(goal);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Goal>.Success(goal);
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var goalId = new GoalId(id);
        var goal = await db.Goals.FirstOrDefaultAsync(g => g.Id == goalId, cancellationToken);
        if (goal is null)
        {
            return Result<Guid>.Failure(ErrorCodes.ResourceNotFound, "Goal not found.");
        }

        db.Goals.Remove(goal);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }
}
