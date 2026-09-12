using FastEndpoints;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.UpdateAsset;

public sealed class UpdateAssetSummary : Summary<UpdateAssetEndpoint, UpdateAssetRequest>
{
    public UpdateAssetSummary()
    {
        Summary = "Update an asset";
        Description = "Revalues or renames an asset. Net worth uses the new value from the next read "
            + "onwards; snapshots already taken keep the value that was current when they were written.";
        ExampleRequest = new UpdateAssetRequest(Guid.Empty, "Flat", AssetType.Property, "185000.00", new DateOnly(2026, 9, 1));
        Params["id"] = "The asset id. Takes precedence over the id in the body.";
        Responses[200] = "The updated asset.";
        Responses[400] = "Validation failed.";
        Responses[404] = "No such asset belongs to the signed-in user.";
    }
}
