using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Goals;

namespace JxFinance.Endpoints.Goals.UpdateGoal;

public sealed class UpdateGoalSummary : Summary<UpdateGoalEndpoint, UpdateGoalRequest>
{
    public UpdateGoalSummary()
    {
        Summary = "Update a savings goal";
        Description = "Changes the name, the target, the target date, how much has been put aside, and where progress "
            + "comes from. For a manual goal this is how progress is recorded: raise currentAmount as money is saved. "
            + "Switching to account funding leaves the stored currentAmount alone and stops using it; switching back "
            + "to manual brings that stored amount into use again.";
        ExampleRequest = new UpdateGoalRequest(
            Guid.Empty,
            "Emergency fund",
            5000.00m,
            1500.00m,
            new DateOnly(2027, 1, 1),
            GoalFunding.Manual,
            null,
            null);
        Params["id"] = "The goal id. Takes precedence over the id in the body.";
        RequestParam(r => r.CurrentAmount, "Amount saved so far, zero or more. Required for a manual goal, ignored for a goal funded from an account.");
        RequestParam(r => r.Funding, "Where progress comes from: manual or account.");
        RequestParam(r => r.FundingAccountId, "The account that funds the goal. Required when funding is account, and must be empty otherwise.");
        RequestParam(r => r.FundingSharePercent, "The share of that account's balance that counts, as a whole percentage from 1 to 100. Defaults to 100.");
        Responses[200] = "The updated goal.";
        Responses[400] = SummaryText.ValidationFailed;
        Responses[404] = "No such goal belongs to the signed-in user.";
    }
}
