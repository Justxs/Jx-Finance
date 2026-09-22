using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Goals.Interfaces;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.CreateGoal;

public sealed class CreateGoalEndpoint(IGoalService goalService) : Endpoint<CreateGoalRequest, GoalResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Goals);
        Group<GoalsGroup>();
        Description(d => d.ProducesCreated<GoalResponse>());
    }

    public override async Task HandleAsync(CreateGoalRequest req, CancellationToken ct)
    {
        await Send.CreatedOrProblemAsync(await goalService.CreateAsync(req, ct), goal => $"{ApiRoutes.GoalsPath}/{goal.Id}", ct);
    }
}
