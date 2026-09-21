using FastEndpoints;
using JxFinance.Endpoints.Goals.Interfaces;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.GetGoals;

public sealed class GetGoalsEndpoint(IGoalService goalService) : EndpointWithoutRequest<IReadOnlyList<GoalResponse>>
{
    public override void Configure()
    {
        Get("goals");
        Group<GoalsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await goalService.GetAllAsync(ct), ct);
    }
}
