using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Goals.Interfaces;

namespace JxFinance.Endpoints.Goals.DeleteGoal;

public sealed class DeleteGoalEndpoint(IGoalService goalService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete("goals/{id}");
        Group<GoalsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        goalService.DeleteAsync(id, ct);
}
