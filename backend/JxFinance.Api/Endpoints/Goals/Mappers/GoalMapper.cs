using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Domain.Goals;
using JxFinance.Endpoints.Goals.CreateGoal;
using JxFinance.Endpoints.Goals.Shared;
using JxFinance.Endpoints.Goals.UpdateGoal;

namespace JxFinance.Endpoints.Goals.Mappers;

public sealed class GoalMapper : Mapper<CreateGoalRequest, GoalResponse, Goal>
{
    public override Goal ToEntity(CreateGoalRequest request) => new()
    {
        Name = request.Name.Trim(),
        TargetAmount = new Money(request.TargetAmount),
        CurrentAmount = new Money(request.CurrentAmount ?? 0m),
        TargetDate = request.TargetDate,
    };

    public void UpdateEntity(UpdateGoalRequest request, Goal goal)
    {
        goal.Name = request.Name.Trim();
        goal.TargetAmount = new Money(request.TargetAmount);
        goal.CurrentAmount = new Money(request.CurrentAmount!.Value);
        goal.TargetDate = request.TargetDate;
    }

    public override GoalResponse FromEntity(Goal goal) => new(
        goal.Id.Value,
        goal.Name,
        goal.TargetAmount.Amount,
        goal.CurrentAmount.Amount,
        goal.TargetDate);
}
