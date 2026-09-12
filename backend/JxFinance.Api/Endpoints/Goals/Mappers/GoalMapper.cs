using FastEndpoints;
using JxFinance.Common;
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
        TargetAmount = MoneyWire.Parse(request.TargetAmount),
        CurrentAmount = MoneyWire.Parse(request.CurrentAmount ?? "0.00"),
        TargetDate = request.TargetDate,
    };

    public void UpdateEntity(UpdateGoalRequest request, Goal goal)
    {
        goal.Name = request.Name.Trim();
        goal.TargetAmount = MoneyWire.Parse(request.TargetAmount);
        goal.CurrentAmount = MoneyWire.Parse(request.CurrentAmount);
        goal.TargetDate = request.TargetDate;
    }

    public override GoalResponse FromEntity(Goal goal) => new(
        goal.Id.Value,
        goal.Name,
        MoneyWire.ToWire(goal.TargetAmount),
        MoneyWire.ToWire(goal.CurrentAmount),
        goal.TargetDate);
}
