using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Transactions.GetTransaction;

public sealed class GetTransactionEndpoint(ITransactionService transactionService)
    : EndpointWithoutRequest<TransactionResponse>
{
    public override void Configure()
    {
        Get("/api/transactions/{id}");
        AllowAnonymous();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await transactionService.GetByIdAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
