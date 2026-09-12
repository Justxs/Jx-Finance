using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.UpdateTransaction;

public sealed class UpdateTransactionEndpoint(ITransactionService transactionService)
    : Endpoint<UpdateTransactionRequest, TransactionResponse>
{
    public override void Configure()
    {
        Put("transactions/{id}");
        Group<TransactionsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateTransactionRequest req, CancellationToken ct)
    {
        var transaction = (await transactionService.UpdateAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(transaction, ct);
    }
}
