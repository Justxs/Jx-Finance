using FastEndpoints;

namespace JxFinance.Endpoints.Settings.SetExchangeRate;

public sealed class SetExchangeRateSummary : Summary<SetExchangeRateEndpoint, SetExchangeRateRequest>
{
    public SetExchangeRateSummary()
    {
        Summary = "Enter an exchange rate by hand";
        Description = "Administrators only. Stores the rate of a currency for one date, in units per euro, replacing "
            + "one entered for the same date before. A rate entered by hand wins over the synced ECB rate of the "
            + "same date and, like any rate, applies until the next stored rate of that currency. In the same "
            + "database transaction every transaction and investment entry dated from that date up to the day before "
            + "the next stored rate, and not after today, whose reporting value depends on the currency is valued "
            + "again; when one of them cannot be valued nothing is saved.";
        RequestParam(r => r.Currency, "The currency, such as usd. Not the euro.");
        RequestParam(r => r.Date, "The date the rate is for, as yyyy-MM-dd. Not in the future.");
        Responses[200] = "The stored rate, with the synced rate of the same date when there is one.";
        Responses[400] = "Invalid rate, currency or date, or a revalued row has no exchange rate.";
        Responses[403] = "Only administrators can enter rates.";
    }
}
