using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Goals;
using JxFinance.Endpoints.Goals.CreateGoal;
using JxFinance.Endpoints.Goals.UpdateGoal;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Goals;

public sealed class GoalService(AppDbContext db) : IGoalService
{
    public async Task<IReadOnlyList<GoalResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var goals = await db.Goals.OrderBy(g => g.CreatedAt).ToListAsync(cancellationToken);
        return goals.Select(ToResponse).ToList();
    }

    public async Task<GoalResponse> CreateAsync(CreateGoalRequest request, CancellationToken cancellationToken)
    {
        var goal = new Goal
        {
            Name = request.Name.Trim(),
            TargetAmount = MoneyWire.Parse(request.TargetAmount),
            CurrentAmount = MoneyWire.Parse(request.CurrentAmount ?? "0.00"),
            TargetDate = request.TargetDate,
        };

        db.Goals.Add(goal);
        await db.SaveChangesAsync(cancellationToken);

        return ToResponse(goal);
    }

    public async Task<Result<GoalResponse>> UpdateAsync(UpdateGoalRequest request, CancellationToken cancellationToken)
    {
        var goalId = new GoalId(request.Id);
        var goal = await db.Goals.FirstOrDefaultAsync(g => g.Id == goalId, cancellationToken);
        if (goal is null)
        {
            return Result<GoalResponse>.Failure(ErrorCodes.NotFound, "Goal not found.");
        }

        goal.Name = request.Name.Trim();
        goal.TargetAmount = MoneyWire.Parse(request.TargetAmount);
        goal.CurrentAmount = MoneyWire.Parse(request.CurrentAmount);
        goal.TargetDate = request.TargetDate;
        await db.SaveChangesAsync(cancellationToken);

        return Result<GoalResponse>.Success(ToResponse(goal));
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

    private static GoalResponse ToResponse(Goal goal) => new(
        goal.Id.Value,
        goal.Name,
        MoneyWire.ToWire(goal.TargetAmount),
        MoneyWire.ToWire(goal.CurrentAmount),
        goal.TargetDate);
}
