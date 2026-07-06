using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Goals.DeleteGoal;

public sealed class DeleteGoalEndpoint(IGoalService goalService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/api/goals/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await goalService.DeleteAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
