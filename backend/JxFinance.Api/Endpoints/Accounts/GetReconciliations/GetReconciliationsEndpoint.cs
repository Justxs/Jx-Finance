using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.GetReconciliations;

public sealed class GetReconciliationsEndpoint(IReconciliationService reconciliationService)
    : Endpoint<GetReconciliationsRequest, IReadOnlyList<ReconciliationResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Accounts + "/{id}/reconciliations");
        Group<AccountsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetReconciliationsRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await reconciliationService.ListAsync(req.Id, ct), ct);
}
