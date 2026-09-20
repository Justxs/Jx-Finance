using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.DeleteTransaction;

public sealed class DeleteTransactionEndpoint(ITransactionService transactionService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete("transactions/{id}");
        Group<TransactionsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        transactionService.DeleteAsync(id, ct);
}
