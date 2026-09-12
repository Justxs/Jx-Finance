using FastEndpoints;
using JxFinance.Endpoints.Goals.Interfaces;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.CreateGoal;

public sealed class CreateGoalEndpoint(IGoalService goalService) : Endpoint<CreateGoalRequest, GoalResponse>
{
    public override void Configure()
    {
        Post("goals");
        Group<GoalsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<GoalResponse>(201, "application/json"));
    }

    public override async Task HandleAsync(CreateGoalRequest req, CancellationToken ct)
    {
        var goal = await goalService.CreateAsync(req, ct);
        await Send.ResultAsync(TypedResults.Created($"/api/goals/{goal.Id}", goal));
    }
}
