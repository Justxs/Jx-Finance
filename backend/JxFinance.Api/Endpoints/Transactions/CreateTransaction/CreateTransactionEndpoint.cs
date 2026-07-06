using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Transactions.GetTransaction;

namespace JxFinance.Endpoints.Transactions.CreateTransaction;

public sealed class CreateTransactionEndpoint(ITransactionService transactionService)
    : Endpoint<CreateTransactionRequest, TransactionResponse>
{
    public override void Configure()
    {
        Post("/api/transactions");
    }

    public override async Task HandleAsync(CreateTransactionRequest req, CancellationToken ct)
    {
        var result = await transactionService.CreateAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.CreatedAtAsync<GetTransactionEndpoint>(
            new { id = result.Value!.Id },
            result.Value,
            cancellation: ct);
    }
}
