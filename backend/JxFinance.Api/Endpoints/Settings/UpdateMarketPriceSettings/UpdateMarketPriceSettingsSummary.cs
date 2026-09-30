using FastEndpoints;

namespace JxFinance.Endpoints.Settings.UpdateMarketPriceSettings;

public sealed class UpdateMarketPriceSettingsSummary : Summary<UpdateMarketPriceSettingsEndpoint, UpdateMarketPriceSettingsRequest>
{
    public UpdateMarketPriceSettingsSummary()
    {
        Summary = "Save the market price settings of this installation";
        Description = "Switches the daily fetch of closing prices on or off and saves, keeps or removes the EODHD API "
            + "key. The key is encrypted with ASP.NET Data Protection before it is stored and is never returned: the "
            + "response carries hasKey instead. While the switch is off the server makes no request to a price "
            + "provider on its own. Administrators only.";
        ExampleRequest = new UpdateMarketPriceSettingsRequest(true, "your-eodhd-key");
        RequestParam(r => r.EodhdApiKey, "Null keeps the saved key, an empty string removes it, anything else replaces it.");
        Responses[200] = "The saved settings, without the key.";
        Responses[403] = "Only administrators can change installation settings.";
    }
}
