using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Goals.Interfaces;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.UpdateGoal;

public sealed class UpdateGoalEndpoint(IGoalService goalService) : Endpoint<UpdateGoalRequest, GoalResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Goals + "/{id}");
        Group<GoalsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateGoalRequest req, CancellationToken ct)
    {
        var goal = (await goalService.UpdateAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(goal, ct);
    }
}
