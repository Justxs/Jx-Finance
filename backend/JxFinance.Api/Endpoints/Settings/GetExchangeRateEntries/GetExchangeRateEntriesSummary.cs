using FastEndpoints;

namespace JxFinance.Endpoints.Settings.GetExchangeRateEntries;

public sealed class GetExchangeRateEntriesSummary : Summary<GetExchangeRateEntriesEndpoint, GetExchangeRateEntriesRequest>
{
    public GetExchangeRateEntriesSummary()
    {
        Summary = "List the stored exchange rates of a currency";
        Description = "Administrators only. Returns the rates of one currency in units per euro, newest first: every "
            + "rate synced from the ECB in the last 30 days and every rate an administrator entered by hand, whatever "
            + "its date. A date with both shows the hand-entered rate, which wins, with the synced one beside it.";
        RequestParam(r => r.Currency, "The currency, such as usd. The euro has no rate of its own.");
        Responses[200] = "The rates, newest first.";
        Responses[403] = "Only administrators can see the stored rates.";
    }
}
