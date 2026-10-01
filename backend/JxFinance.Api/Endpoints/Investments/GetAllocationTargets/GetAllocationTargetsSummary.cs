using FastEndpoints;

namespace JxFinance.Endpoints.Investments.GetAllocationTargets;

public sealed class GetAllocationTargetsSummary : Summary<GetAllocationTargetsEndpoint>
{
    public GetAllocationTargetsSummary()
    {
        Summary = "Get your target allocation";
        Description = "Returns the target shares you set for your investments, in percent, and the one dimension they "
            + "are set by: security type (keys such as etf or stock), the security's currency (eur, usd) or the security "
            + "itself (its id, answered with its symbol). Targets belong to the signed-in member alone and are the same "
            + "whichever account or household is chosen. Without targets, dimension is null and targets is empty. "
            + "Compare them with byType, byCurrency or the holdings of GET /api/investments/portfolio.";
        Responses[200] = "Your targets, largest share first.";
    }
}
