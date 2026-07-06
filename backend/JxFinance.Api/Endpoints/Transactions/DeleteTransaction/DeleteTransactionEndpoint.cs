using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Transactions.DeleteTransaction;

public sealed class DeleteTransactionEndpoint(ITransactionService transactionService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/api/transactions/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await transactionService.DeleteAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
