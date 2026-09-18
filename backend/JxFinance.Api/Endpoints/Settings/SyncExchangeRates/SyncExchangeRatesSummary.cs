using FastEndpoints;

namespace JxFinance.Endpoints.Settings.SyncExchangeRates;

public sealed class SyncExchangeRatesSummary : Summary<SyncExchangeRatesEndpoint>
{
    public SyncExchangeRatesSummary()
    {
        Summary = "Fetch exchange rates now";
        Description = "Administrators only. Fetches reference rates published since the newest stored "
            + "date. It works even when automatic sync is turned off.";
        Responses[200] = "How many rates were added and the newest rate date now stored.";
        Responses[403] = "Only administrators can sync rates.";
    }
}
