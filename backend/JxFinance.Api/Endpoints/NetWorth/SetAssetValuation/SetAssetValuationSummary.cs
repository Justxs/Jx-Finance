using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.NetWorth.SetAssetValuation;

public sealed class SetAssetValuationSummary : Summary<SetAssetValuationEndpoint, SetAssetValuationRequest>
{
    public SetAssetValuationSummary()
    {
        Summary = "Record a valuation of an asset";
        Description = "Records what the asset was worth on one date, replacing a valuation already recorded for that "
            + "date. The current value and as-of date of the asset follow the newest valuation, so a valuation for an "
            + "earlier date only adds history. On a depreciating asset a valuation on or after the start date restarts "
            + "the decline from that value at the same monthly amount. Net worth snapshots already taken are not rewritten.";
        Params["id"] = "The asset id.";
        Params["date"] = "The date of the valuation, as yyyy-MM-dd. Not in the future.";
        RequestParam(r => r.Value, "Decimal string with at most two decimal places, in the currency of the asset.");
        RequestParam(r => r.Note, "Optional, up to 200 characters, such as \"dealer quote\".");
        Responses[200] = "The asset with its new current value.";
        Responses[400] = SummaryText.ValidationFailed;
        Responses[404] = "No such asset belongs to the signed-in user.";
        Responses[409] = "Someone else recorded a valuation for the same date at the same moment. Try again.";
    }
}
