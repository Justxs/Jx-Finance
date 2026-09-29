using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.RecordReconciliation;

public sealed class RecordReconciliationEndpoint(IReconciliationService reconciliationService)
    : Endpoint<RecordReconciliationRequest, ReconciliationResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Accounts + "/{id}/reconciliations");
        Group<AccountsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(RecordReconciliationRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(
            await reconciliationService.RecordAsync(req.Id, req.Date, req.Balance!.Value, ReconciliationSource.Manual, ct),
            ct);
}
