using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.DismissUnusualAmount;

public sealed class DismissUnusualAmountEndpoint(ITransactionService transactionService) : DeleteEndpoint
{
    public const string Route = ApiRoutes.Transactions + "/{id}/unusual/dismiss";

    public override void Configure()
    {
        Post(Route);
        Group<TransactionsGroup>();
        Options(b => b.WithMetadata(new RequiresFeature(Feature.UnusualAmounts)));
        Description(d => d.Produces(204).ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        transactionService.SetUnusualDismissedAsync(id, true, ct);
}
