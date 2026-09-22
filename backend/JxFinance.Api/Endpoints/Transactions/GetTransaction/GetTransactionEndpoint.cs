using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.GetTransaction;

public sealed class GetTransactionEndpoint(ITransactionService transactionService)
    : EndpointWithoutRequest<TransactionResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Transactions + "/{id}");
        Group<TransactionsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var transaction = (await transactionService.GetByIdAsync(Route<Guid>("id"), ct)).ValueOrThrow();
        await Send.OkAsync(transaction, ct);
    }
}
