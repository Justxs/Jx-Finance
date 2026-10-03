using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Transactions.DismissUnusualAmount;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.RestoreUnusualAmount;

public sealed class RestoreUnusualAmountEndpoint(ITransactionWriteService transactionService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(DismissUnusualAmountEndpoint.Route);
        Group<TransactionsGroup>();
        Options(b => b.WithMetadata(new RequiresFeature(Feature.UnusualAmounts)));
        Description(d => d.Produces(204).ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        transactionService.SetUnusualDismissedAsync(id, false, ct);
}
