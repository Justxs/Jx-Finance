using FastEndpoints;
using JxFinance.Endpoints.Goals.Interfaces;
using JxFinance.Endpoints.Goals.Mappers;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.GetGoals;

public sealed class GetGoalsEndpoint(IGoalService goalService) : EndpointWithoutRequest<IReadOnlyList<GoalResponse>, GoalMapper>
{
    public override void Configure()
    {
        Get("goals");
        Group<GoalsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var goals = await goalService.GetAllAsync(ct);
        await Send.OkAsync(goals.Select(Map.FromEntity).ToList(), ct);
    }
}
