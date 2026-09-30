using FastEndpoints;

namespace JxFinance.Endpoints.Settings.SyncMarketPrices;

public sealed class SyncMarketPricesSummary : Summary<SyncMarketPricesEndpoint>
{
    public SyncMarketPricesSummary()
    {
        Summary = "Fetch closing prices now";
        Description = "Fetches the missing closing prices of every held security that has a price source, as the "
            + "daily run does, including securities whose last fetch failed less than a day ago. Works whether or not "
            + "the daily fetch is switched on. EODHD calls count against the daily limit. Administrators only.";
        Responses[200] = "How many securities were checked, how many prices were written, how many securities failed, "
            + "and the EODHD calls left today.";
        Responses[400] = "marketPrices.keyRequired or marketPrices.keyUnreadable when a security uses EODHD and the key "
            + "is missing or cannot be read.";
        Responses[403] = "Only administrators can fetch prices.";
    }
}
