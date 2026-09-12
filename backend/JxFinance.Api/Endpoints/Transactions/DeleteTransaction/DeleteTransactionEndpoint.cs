using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.DeleteTransaction;

public sealed class DeleteTransactionEndpoint(ITransactionService transactionService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("transactions/{id}");
        Group<TransactionsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await transactionService.DeleteAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
