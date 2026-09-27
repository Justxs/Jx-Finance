using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.GetAssetValuations;

public sealed class GetAssetValuationsSummary : Summary<GetAssetValuationsEndpoint, GetAssetValuationsRequest>
{
    public GetAssetValuationsSummary()
    {
        Summary = "List the valuations of an asset";
        Description = "Returns the dated valuations of an asset, newest first. Each is a value set by hand for one date, "
            + "in the currency of the asset. Depreciation writes no valuations: it is computed from them on every read.";
        Params["id"] = "The asset id.";
        Responses[200] = "The valuations, newest first.";
        Responses[404] = "No such asset belongs to the signed-in user.";
    }
}
