using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.GetSharedExpenses;

public sealed class GetSharedExpensesEndpoint(ISettleUpService settleUpService)
    : Endpoint<GetSharedExpensesRequest, PagedResponse<SharedExpenseResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Households + "/{id}/shared-expenses");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetSharedExpensesRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await settleUpService.GetSharedExpensesAsync(req, ct), ct);
}
