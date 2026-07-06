using FastEndpoints;

namespace JxFinance.Endpoints.Goals.GetGoals;

public sealed class GetGoalsEndpoint(IGoalService goalService) : EndpointWithoutRequest<IReadOnlyList<GoalResponse>>
{
    public override void Configure()
    {
        Get("/api/goals");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var goals = await goalService.GetAllAsync(ct);
        await Send.OkAsync(goals, ct);
    }
}
