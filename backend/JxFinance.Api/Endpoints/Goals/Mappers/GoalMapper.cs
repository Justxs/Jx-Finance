using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Domain.Goals;
using JxFinance.Endpoints.Goals.CreateGoal;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.Mappers;

public sealed class GoalMapper : Mapper<CreateGoalRequest, GoalResponse, Goal>
{
    public override Goal ToEntity(CreateGoalRequest request)
    {
        var goal = new Goal { Name = request.Name };
        Apply(request, goal);
        return goal;
    }

    public void Apply(IGoalInput input, Goal goal)
    {
        goal.Name = input.Name.Trim();
        goal.TargetAmount = new Money(input.TargetAmount);
        goal.CurrentAmount = new Money(input.CurrentAmount ?? 0m);
        goal.TargetDate = input.TargetDate;
    }

    public override GoalResponse FromEntity(Goal goal) => new(
        goal.Id.Value,
        goal.Name,
        goal.TargetAmount.Amount,
        goal.CurrentAmount.Amount,
        goal.TargetDate);
}
