using FastEndpoints;

namespace JxFinance.Endpoints.Goals.UpdateGoal;

public sealed class UpdateGoalSummary : Summary<UpdateGoalEndpoint, UpdateGoalRequest>
{
    public UpdateGoalSummary()
    {
        Summary = "Update a savings goal";
        Description = "Changes the name, the target, the target date, or how much has been put aside. "
            + "This is how progress is recorded: raise currentAmount as money is saved.";
        ExampleRequest = new UpdateGoalRequest(Guid.Empty, "Emergency fund", 5000.00m, 1500.00m, new DateOnly(2027, 1, 1));
        Params["id"] = "The goal id. Takes precedence over the id in the body.";
        Responses[200] = "The updated goal.";
        Responses[400] = "Validation failed.";
        Responses[404] = "No such goal belongs to the signed-in user.";
    }
}
