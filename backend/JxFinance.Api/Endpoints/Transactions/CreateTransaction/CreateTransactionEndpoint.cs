using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Transactions.GetTransaction;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.CreateTransaction;

public sealed class CreateTransactionEndpoint(ITransactionService transactionService)
    : Endpoint<CreateTransactionRequest, TransactionResponse>
{
    public override void Configure()
    {
        Post("transactions");
        Group<TransactionsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<TransactionResponse>(201, "application/json"));
    }

    public override async Task HandleAsync(CreateTransactionRequest req, CancellationToken ct)
    {
        var transaction = (await transactionService.CreateAsync(req, ct)).ValueOrThrow();
        await Send.CreatedAtAsync<GetTransactionEndpoint>(new { id = transaction.Id }, transaction, cancellation: ct);
    }
}
