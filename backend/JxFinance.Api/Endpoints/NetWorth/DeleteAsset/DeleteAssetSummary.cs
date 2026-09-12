using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.DeleteAsset;

public sealed class DeleteAssetSummary : Summary<DeleteAssetEndpoint>
{
    public DeleteAssetSummary()
    {
        Summary = "Delete an asset";
        Description = "Stops tracking the asset. Snapshots already recorded keep the value it had.";
        Params["id"] = "The asset id.";
        Responses[204] = "The asset is gone.";
        Responses[404] = "No such asset belongs to the signed-in user.";
    }
}
