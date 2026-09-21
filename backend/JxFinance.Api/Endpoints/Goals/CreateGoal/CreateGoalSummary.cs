using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Goals;

namespace JxFinance.Endpoints.Goals.CreateGoal;

public sealed class CreateGoalSummary : Summary<CreateGoalEndpoint, CreateGoalRequest>
{
    public CreateGoalSummary()
    {
        Summary = "Create a savings goal";
        Description = "Starts tracking progress towards a target amount, optionally by a target date. "
            + "A manual goal keeps the amount you type in currentAmount; moving money does not update it by itself. "
            + "A goal funded from an account follows that account's reporting balance instead, taking the share "
            + "given by fundingSharePercent, and ignores currentAmount.";
        ExampleRequest = new CreateGoalRequest(
            "Emergency fund",
            5000.00m,
            1200.00m,
            new DateOnly(2027, 1, 1),
            GoalFunding.Manual,
            null,
            null);
        RequestParam(r => r.TargetAmount, SummaryText.PositiveMoney);
        RequestParam(r => r.CurrentAmount, "Amount already saved, zero or more. Defaults to zero when omitted, and is ignored for a goal funded from an account.");
        RequestParam(r => r.TargetDate, "Optional date to reach the target by, as YYYY-MM-DD.");
        RequestParam(r => r.Funding, "Where progress comes from: manual (the default) or account.");
        RequestParam(r => r.FundingAccountId, "The account that funds the goal. Required when funding is account, and must be empty otherwise.");
        RequestParam(r => r.FundingSharePercent, "The share of that account's balance that counts, as a whole percentage from 1 to 100. Defaults to 100.");
        Responses[201] = "The goal was created. The Location header points at it.";
        Responses[400] = SummaryText.ValidationFailed;
    }
}
