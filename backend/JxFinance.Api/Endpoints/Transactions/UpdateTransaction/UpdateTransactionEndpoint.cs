using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Transactions.UpdateTransaction;

public sealed class UpdateTransactionEndpoint(ITransactionService transactionService)
    : Endpoint<UpdateTransactionRequest, TransactionResponse>
{
    public override void Configure()
    {
        Put("/api/transactions/{id}");
        AllowAnonymous();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateTransactionRequest req, CancellationToken ct)
    {
        var result = await transactionService.UpdateAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
