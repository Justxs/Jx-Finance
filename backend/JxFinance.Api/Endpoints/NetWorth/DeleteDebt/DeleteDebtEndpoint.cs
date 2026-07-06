using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.NetWorth.DeleteDebt;

public sealed class DeleteDebtEndpoint(INetWorthService netWorthService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/api/debts/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await netWorthService.DeleteDebtAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
