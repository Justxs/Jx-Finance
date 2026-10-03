using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.DeleteTransaction;

public sealed class DeleteTransactionEndpoint(ITransactionWriteService transactionService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Transactions + "/{id}");
        Group<TransactionsGroup>();
        Options(b => b.WithMetadata(TokenWritable.Yes));
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        transactionService.DeleteAsync(id, ct);
}
