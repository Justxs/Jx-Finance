using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.CreateAsset;

public sealed class CreateAssetSummary : Summary<CreateAssetEndpoint, CreateAssetRequest>
{
    public const string DepreciationText = "Optional straight-line depreciation: startDate (not in the future), startValue, "
        + "lifeMonths (1 to 600) and residualValue (0 or more, below the start value). Give all four or leave it out "
        + "(asset.depreciationIncomplete). The value falls by (startValue - residualValue) / lifeMonths, rounded up to "
        + "the cent, on the start date's day of each month and never below the residual value.";

    public CreateAssetSummary()
    {
        Summary = "Add an asset";
        Description = "Starts tracking something of value that is not an account balance. Its value "
            + "counts towards net worth from the as-of date onwards. The asset is kept in the reporting currency of "
            + "the day it is created, and later edits keep that currency. The value and date become its first valuation.";
        ExampleRequest = new CreateAssetRequest("Flat", AssetType.Property, 180000.00m, new DateOnly(2026, 9, 1));
        RequestParam(r => r.Type, "Property, Vehicle, Investment, Valuable, or Other.");
        RequestParam(r => r.CurrentValue, "Decimal string with at most two decimal places.");
        RequestParam(r => r.AsOf, "The date the valuation is good for, as YYYY-MM-DD. Not in the future.");
        RequestParam(r => r.Depreciation, DepreciationText);
        Responses[201] = "The asset was created. The Location header points at it.";
        Responses[400] = SummaryText.ValidationFailed;
    }
}
