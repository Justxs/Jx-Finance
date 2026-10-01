using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.KeepPossibleDuplicates;

public sealed class KeepPossibleDuplicatesEndpoint(ITransactionService transactionService) : DeleteEndpoint
{
    public override void Configure()
    {
        Post(ApiRoutes.Transactions + "/{id}/duplicates/keep");
        Group<TransactionsGroup>();
        Description(d => d.Produces(204).ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        transactionService.KeepPossibleDuplicatesAsync(id, ct);
}
