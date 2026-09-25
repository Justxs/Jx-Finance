using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.GetNetWorth;

public sealed class GetNetWorthEndpoint(INetWorthService netWorthService) : EndpointWithoutRequest<NetWorthResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.NetWorth);
        Group<NetWorthGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await netWorthService.GetCurrentAsync(ct), ct);
}
