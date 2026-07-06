using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Goals.UpdateGoal;

public sealed class UpdateGoalEndpoint(IGoalService goalService) : Endpoint<UpdateGoalRequest, GoalResponse>
{
    public override void Configure()
    {
        Put("/api/goals/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateGoalRequest req, CancellationToken ct)
    {
        var result = await goalService.UpdateAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
