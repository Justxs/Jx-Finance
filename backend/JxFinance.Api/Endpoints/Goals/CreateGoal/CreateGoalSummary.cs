using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.Goals.CreateGoal;

public sealed class CreateGoalSummary : Summary<CreateGoalEndpoint, CreateGoalRequest>
{
    public CreateGoalSummary()
    {
        Summary = "Create a savings goal";
        Description = "Starts tracking progress towards a target amount, optionally by a target date. "
            + "The goal is a standalone tracker: it is not tied to an account, and moving money does not "
            + "update it by itself.";
        ExampleRequest = new CreateGoalRequest("Emergency fund", 5000.00m, 1200.00m, new DateOnly(2027, 1, 1));
        RequestParam(r => r.TargetAmount, SummaryText.PositiveMoney);
        RequestParam(r => r.CurrentAmount, "Amount already saved, zero or more. Defaults to zero when omitted.");
        RequestParam(r => r.TargetDate, "Optional date to reach the target by, as YYYY-MM-DD.");
        Responses[201] = "The goal was created. The Location header points at it.";
        Responses[400] = SummaryText.ValidationFailed;
    }
}
