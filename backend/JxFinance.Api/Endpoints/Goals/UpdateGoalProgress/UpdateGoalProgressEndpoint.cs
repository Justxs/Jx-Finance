using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Goals.Interfaces;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.UpdateGoalProgress;

public sealed class UpdateGoalProgressEndpoint(IGoalService goalService) : Endpoint<UpdateGoalProgressRequest, GoalResponse>
{
    public override void Configure()
    {
        Patch(ApiRoutes.Goals + "/{id}/progress");
        Group<GoalsGroup>();
        Metadata(TokenWritable.Yes);
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateGoalProgressRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await goalService.UpdateProgressAsync(req, ct), ct);
}
