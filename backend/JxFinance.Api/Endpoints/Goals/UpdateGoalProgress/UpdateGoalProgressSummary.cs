using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.Goals.UpdateGoalProgress;

public sealed class UpdateGoalProgressSummary : Summary<UpdateGoalProgressEndpoint, UpdateGoalProgressRequest>
{
    public UpdateGoalProgressSummary()
    {
        Summary = "Update a manual goal's progress";
        Description = "Moves the saved amount of a manual goal without sending the rest of the goal, so a script or "
            + "an automation can record what it put aside. Send currentAmount to set the amount, or delta to add to "
            + "it (a negative delta takes money out); exactly one of the two. The result may exceed the target but "
            + "never fall below zero. A goal funded from an account follows that account and answers goal.notManual. "
            + "A read-and-write personal API token may call this.";
        ExampleRequest = new UpdateGoalProgressRequest(Guid.Empty, null, 50.00m);
        Params["id"] = "The goal id. Takes precedence over the id in the body.";
        RequestParam(r => r.CurrentAmount, "The new amount saved so far, zero or more. Leave empty when sending delta.");
        RequestParam(r => r.Delta, "An amount to add to the saved amount, negative to take some out. Leave empty when sending currentAmount.");
        Responses[200] = "The updated goal.";
        Responses[400] = SummaryText.ValidationFailed + " Also goal.notManual for a goal funded from an account, money.nonNegative when a delta would take the amount below zero, and money.invalid when it would take the amount past the largest storable amount.";
        Responses[404] = "No such goal is visible to the signed-in user.";
    }
}
