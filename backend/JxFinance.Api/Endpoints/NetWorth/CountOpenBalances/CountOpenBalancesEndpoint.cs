using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.CountOpenBalances;

public sealed class CountOpenBalancesEndpoint(INetWorthService netWorthService)
    : Endpoint<CountOpenBalancesRequest, NetWorthResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.NetWorth + "/open-balances");
        Group<NetWorthGroup>();
    }

    public override async Task HandleAsync(CountOpenBalancesRequest req, CancellationToken ct) =>
        await Send.OkAsync(await netWorthService.CountOpenBalancesAsync(req.Count!.Value, ct), ct);
}
