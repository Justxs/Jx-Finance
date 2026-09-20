using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.CreateAsset;

public sealed class CreateAssetSummary : Summary<CreateAssetEndpoint, CreateAssetRequest>
{
    public CreateAssetSummary()
    {
        Summary = "Add an asset";
        Description = "Starts tracking something of value that is not an account balance. Its value "
            + "counts towards net worth from the as-of date onwards.";
        ExampleRequest = new CreateAssetRequest("Flat", AssetType.Property, 180000.00m, new DateOnly(2026, 9, 1));
        RequestParam(r => r.Type, "Property, Vehicle, Investment, Valuable, or Other.");
        RequestParam(r => r.CurrentValue, "Decimal string with at most two decimal places.");
        RequestParam(r => r.AsOf, "The date the valuation is good for, as YYYY-MM-DD.");
        Responses[201] = "The asset was created. The Location header points at it.";
        Responses[400] = SummaryText.ValidationFailed;
    }
}
