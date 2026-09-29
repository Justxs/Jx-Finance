using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.GetSettlements;

public sealed class GetSettlementsEndpoint(ISettleUpService settleUpService)
    : Endpoint<GetSettlementsRequest, PagedResponse<HouseholdSettlementResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Households + "/{id}/settlements");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetSettlementsRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await settleUpService.GetSettlementsAsync(req, ct), ct);
}
