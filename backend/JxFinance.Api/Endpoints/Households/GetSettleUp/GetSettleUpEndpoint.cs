using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.GetSettleUp;

public sealed class GetSettleUpEndpoint(ISettleUpService settleUpService) : EndpointWithoutRequest<SettleUpResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Households + "/{id}/settle-up");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkOrProblemAsync(await settleUpService.GetBalancesAsync(Route<Guid>("id"), ct), ct);
}
