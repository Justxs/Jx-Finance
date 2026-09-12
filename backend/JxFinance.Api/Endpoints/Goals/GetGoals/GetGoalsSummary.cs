using FastEndpoints;

namespace JxFinance.Endpoints.Goals.GetGoals;

public sealed class GetGoalsSummary : Summary<GetGoalsEndpoint>
{
    public GetGoalsSummary()
    {
        Summary = "List savings goals";
        Description = "Returns your savings goals with the amount saved so far against each target.";
        Responses[200] = "The goals belonging to the signed-in user.";
    }
}
