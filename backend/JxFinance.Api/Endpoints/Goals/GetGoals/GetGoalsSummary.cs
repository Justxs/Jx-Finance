using FastEndpoints;

namespace JxFinance.Endpoints.Goals.GetGoals;

public sealed class GetGoalsSummary : Summary<GetGoalsEndpoint>
{
    public GetGoalsSummary()
    {
        Summary = "List savings goals";
        Description = "Returns your savings goals with the amount saved so far against each target in progressAmount. "
            + "For a manual goal that is the stored currentAmount; for a goal funded from an account it is the share "
            + "of that account's reporting balance, computed for this request and never below zero. "
            + "progressAmount is null when the funding account is archived or no longer visible, and the rest of the "
            + "list is still returned.";
        Responses[200] = "The goals belonging to the signed-in user.";
    }
}
