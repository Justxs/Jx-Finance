using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.CreateTransaction;

public sealed class CreateTransactionEndpoint(ITransactionService transactionService)
    : Endpoint<CreateTransactionRequest, TransactionResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Transactions);
        Group<TransactionsGroup>();
        Description(d => d.ProducesCreated<TransactionResponse>());
    }

    public override async Task HandleAsync(CreateTransactionRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(await transactionService.CreateAsync(req, ct), transaction => $"{ApiRoutes.TransactionsPath}/{transaction.Id}", ct);
}
