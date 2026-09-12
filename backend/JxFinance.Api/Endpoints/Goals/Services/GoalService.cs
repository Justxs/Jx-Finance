using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Goals;
using JxFinance.Endpoints.Goals.CreateGoal;
using JxFinance.Endpoints.Goals.Interfaces;
using JxFinance.Endpoints.Goals.Mappers;
using JxFinance.Endpoints.Goals.Shared;
using JxFinance.Endpoints.Goals.UpdateGoal;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Goals.Services;

public sealed class GoalService(AppDbContext db, GoalMapper mapper) : IGoalService
{
    public async Task<IReadOnlyList<GoalResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var goals = await db.Goals.OrderBy(g => g.CreatedAt).ToListAsync(cancellationToken);
        return goals.Select(mapper.FromEntity).ToList();
    }

    public async Task<GoalResponse> CreateAsync(CreateGoalRequest request, CancellationToken cancellationToken)
    {
        var goal = mapper.ToEntity(request);

        db.Goals.Add(goal);
        await db.SaveChangesAsync(cancellationToken);

        return mapper.FromEntity(goal);
    }

    public async Task<Result<GoalResponse>> UpdateAsync(UpdateGoalRequest request, CancellationToken cancellationToken)
    {
        var goalId = new GoalId(request.Id);
        var goal = await db.Goals.FirstOrDefaultAsync(g => g.Id == goalId, cancellationToken);
        if (goal is null)
        {
            return Result<GoalResponse>.Failure(ErrorCodes.NotFound, "Goal not found.");
        }

        mapper.UpdateEntity(request, goal);
        await db.SaveChangesAsync(cancellationToken);

        return Result<GoalResponse>.Success(mapper.FromEntity(goal));
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var goalId = new GoalId(id);
        var goal = await db.Goals.FirstOrDefaultAsync(g => g.Id == goalId, cancellationToken);
        if (goal is null)
        {
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Goal not found.");
        }

        db.Goals.Remove(goal);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }
}
