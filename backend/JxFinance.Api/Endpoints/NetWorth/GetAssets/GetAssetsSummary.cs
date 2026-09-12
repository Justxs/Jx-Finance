using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.GetAssets;

public sealed class GetAssetsSummary : Summary<GetAssetsEndpoint>
{
    public GetAssetsSummary()
    {
        Summary = "List assets";
        Description = "Returns the assets you track outside the ledger, such as property or vehicles, "
            + "each with its latest valuation and the date that valuation is as of.";
        Responses[200] = "The assets belonging to the signed-in user.";
    }
}
