using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.GetNetWorthHistory;

public sealed class GetNetWorthHistoryEndpoint(INetWorthService netWorthService)
    : EndpointWithoutRequest<NetWorthHistoryResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.NetWorth + "/history");
        Group<NetWorthGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await netWorthService.GetHistoryAsync(ct), ct);
}
