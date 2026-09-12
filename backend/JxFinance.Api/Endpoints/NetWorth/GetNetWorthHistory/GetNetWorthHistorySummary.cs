using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.GetNetWorthHistory;

public sealed class GetNetWorthHistorySummary : Summary<GetNetWorthHistoryEndpoint>
{
    public GetNetWorthHistorySummary()
    {
        Summary = "Get the net worth history";
        Description = "Returns the snapshots taken by the nightly background job, oldest first. "
            + "Snapshots are only written while the job runs, so a freshly seeded instance can answer "
            + "with an empty series.";
        Responses[200] = "The recorded snapshots.";
    }
}
