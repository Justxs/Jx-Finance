using FastEndpoints;

namespace JxFinance.Endpoints.Goals.CreateGoal;

public sealed class CreateGoalEndpoint(IGoalService goalService) : Endpoint<CreateGoalRequest, GoalResponse>
{
    public override void Configure()
    {
        Post("/api/goals");
    }

    public override async Task HandleAsync(CreateGoalRequest req, CancellationToken ct)
    {
        var goal = await goalService.CreateAsync(req, ct);
        await Send.ResultAsync(Results.Created($"/api/goals/{goal.Id}", goal));
    }
}
