using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Accounts.Interfaces;

namespace JxFinance.Endpoints.Accounts.GetReconciliationPreview;

public sealed class GetReconciliationPreviewEndpoint(IReconciliationService reconciliationService)
    : Endpoint<GetReconciliationPreviewRequest, ReconciliationPreviewResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Accounts + "/{id}/reconciliations/preview");
        Group<AccountsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetReconciliationPreviewRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await reconciliationService.PreviewAsync(req.Id, req.Date, req.Currency, ct), ct);
}
