using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Goals;
using JxFinance.Endpoints.Goals.CreateGoal;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.Mappers;

public static class GoalMapper
{
    public static Goal ToEntity(this CreateGoalRequest request, Currency reportingCurrency)
    {
        var goal = new Goal { Name = request.Name };
        request.ApplyTo(goal, reportingCurrency);
        return goal;
    }

    public static void ApplyTo(this IGoalInput input, Goal goal, Currency reportingCurrency)
    {
        goal.Name = input.Name.Trim();
        goal.TargetAmount = new Money(input.TargetAmount, reportingCurrency);
        goal.TargetDate = input.TargetDate;
        goal.Funding = input.Funding;
        goal.FundingSharePercent = input.FundingSharePercent ?? 100;
        goal.FundingAccountId = input.FundingAccount();

        if (input.Funding != GoalFunding.Account)
        {
            goal.CurrentAmount = new Money(input.CurrentAmount ?? 0m, reportingCurrency);
        }
    }

    public static AccountId? FundingAccount(this IGoalInput input) =>
        input.Funding == GoalFunding.Account ? new AccountId(input.FundingAccountId!.Value) : null;

    public static GoalResponse ToResponse(this Goal goal, decimal? progressAmount) => new(
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
