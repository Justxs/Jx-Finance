using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Accounts.Interfaces;

namespace JxFinance.Endpoints.Accounts.DeleteReconciliation;

public sealed class DeleteReconciliationEndpoint(IReconciliationService reconciliationService)
    : Endpoint<DeleteReconciliationRequest>
{
    public override void Configure()
    {
        Delete(ApiRoutes.Accounts + "/{id}/reconciliations/{reconciliationId}");
        Group<AccountsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(DeleteReconciliationRequest req, CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await reconciliationService.DeleteAsync(req.Id, req.ReconciliationId, ct), ct);
}
