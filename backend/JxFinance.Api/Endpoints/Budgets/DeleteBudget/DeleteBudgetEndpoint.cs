using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Budgets.DeleteBudget;

public sealed class DeleteBudgetEndpoint(IBudgetService budgetService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/api/budgets/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await budgetService.DeleteAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
