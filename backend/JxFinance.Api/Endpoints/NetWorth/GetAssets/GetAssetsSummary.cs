using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.GetAssets;

public sealed class GetAssetsSummary : Summary<GetAssetsEndpoint>
{
    public GetAssetsSummary()
    {
        Summary = "List assets";
        Description = "Returns the assets you track outside the ledger, such as property or vehicles, "
            + "each with its latest valuation, the date that valuation is as of, and its value today, which is lower "
            + "than the latest valuation when the asset depreciates.";
        Responses[200] = "The assets belonging to the signed-in user.";
    }
}
