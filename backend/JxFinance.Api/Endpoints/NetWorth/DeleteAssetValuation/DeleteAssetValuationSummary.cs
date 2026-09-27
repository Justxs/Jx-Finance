using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.DeleteAssetValuation;

public sealed class DeleteAssetValuationSummary : Summary<DeleteAssetValuationEndpoint, DeleteAssetValuationRequest>
{
    public DeleteAssetValuationSummary()
    {
        Summary = "Delete a valuation of an asset";
        Description = "Removes the valuation recorded for one date for good; it does not go to the trash. The current "
            + "value of the asset becomes the newest remaining valuation. The last valuation cannot be deleted.";
        Params["id"] = "The asset id.";
        Params["date"] = "The date of the valuation, as yyyy-MM-dd.";
        Responses[204] = "Deleted.";
        Responses[400] = "asset.lastValuation when this is the only valuation of the asset.";
        Responses[404] = "No such asset belongs to the signed-in user, or no valuation is recorded for that date.";
    }
}
