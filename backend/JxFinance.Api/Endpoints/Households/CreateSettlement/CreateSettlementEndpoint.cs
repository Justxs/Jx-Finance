using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.CreateSettlement;

public sealed class CreateSettlementEndpoint(ISettleUpService settleUpService)
    : Endpoint<CreateSettlementRequest, HouseholdSettlementResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Households + "/{id}/settlements");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesCreated<HouseholdSettlementResponse>()
            .ProducesProblemDetails(403)
            .ProducesProblemDetails(404)
            .ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(CreateSettlementRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(
            await settleUpService.CreateSettlementAsync(req, ct),
            settlement => $"{ApiRoutes.HouseholdsPath}/{req.Id}/settlements/{settlement.Id}",
            ct);
}
