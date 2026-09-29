using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.UpdateSharedExpense;

public sealed class UpdateSharedExpenseEndpoint(ISettleUpService settleUpService)
    : Endpoint<UpdateSharedExpenseRequest, SharedExpenseResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Households + "/{id}/shared-expenses/{expenseId}");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateSharedExpenseRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await settleUpService.UpdateSharedExpenseAsync(req, ct), ct);
}
