using FastEndpoints;

namespace JxFinance.Endpoints.Settings.GetMarketPriceSettings;

public sealed class GetMarketPriceSettingsSummary : Summary<GetMarketPriceSettingsEndpoint>
{
    public GetMarketPriceSettingsSummary()
    {
        Summary = "Read the market price settings of this installation";
        Description = "Answers whether closing prices are fetched daily, whether an EODHD API key is saved (never the "
            + "key itself), when the last fetch ran, how many EODHD calls are left today, and the securities whose last "
            + "fetch failed with the reason. Administrators only.";
        Responses[200] = "The market price settings, without the key.";
        Responses[403] = "Only administrators can read the market price settings.";
    }
}
