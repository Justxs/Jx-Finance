using FastEndpoints;

namespace JxFinance.Endpoints.Goals.DeleteGoal;

public sealed class DeleteGoalSummary : Summary<DeleteGoalEndpoint>
{
    public DeleteGoalSummary()
    {
        Summary = "Delete a savings goal";
        Description = "Removes the goal and its recorded progress. Nothing else in the ledger changes.";
        Params["id"] = "The goal id.";
        Responses[204] = "The goal is gone.";
        Responses[404] = "No such goal belongs to the signed-in user.";
    }
}
