using FastEndpoints;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Goals;
using JxFinance.Endpoints.Goals.CreateGoal;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.Mappers;

[RegisterService<GoalMapper>(LifeTime.Singleton)]
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
        goal.TargetDate = input.TargetDate;
        goal.Funding = input.Funding;
        goal.FundingSharePercent = input.FundingSharePercent ?? 100;

        if (input.Funding == GoalFunding.Account)
        {
            goal.FundingAccountId = new AccountId(input.FundingAccountId!.Value);
            return;
        }

        goal.FundingAccountId = null;
        goal.CurrentAmount = new Money(input.CurrentAmount ?? 0m);
    }

    public GoalResponse FromEntity(Goal goal, decimal? progressAmount) => new(
        goal.Id.Value,
        goal.Name,
        goal.TargetAmount.Amount,
        goal.CurrentAmount.Amount,
        goal.TargetDate,
        goal.Funding,
        goal.FundingAccountId?.Value,
        goal.FundingSharePercent,
        progressAmount);
}
