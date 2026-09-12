using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Goals.Interfaces;

namespace JxFinance.Endpoints.Goals.DeleteGoal;

public sealed class DeleteGoalEndpoint(IGoalService goalService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("goals/{id}");
        Group<GoalsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await goalService.DeleteAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
