using FastEndpoints;

namespace JxFinance.Endpoints.Settings.DeleteExchangeRate;

public sealed class DeleteExchangeRateSummary : Summary<DeleteExchangeRateEndpoint, DeleteExchangeRateRequest>
{
    public DeleteExchangeRateSummary()
    {
        Summary = "Delete an exchange rate entered by hand";
        Description = "Administrators only. Removes the rate entered by hand for a currency and date, so the synced "
            + "ECB rate of that date, or else the newest stored rate before it, applies again. The rows that depended "
            + "on it are valued again in the same way as when the rate was entered; when one of them would be left "
            + "without a rate nothing is deleted. Synced rates cannot be deleted.";
        RequestParam(r => r.Currency, "The currency, such as usd.");
        RequestParam(r => r.Date, "The date of the rate, as yyyy-MM-dd.");
        Responses[204] = "Deleted.";
        Responses[400] = "A revalued row would have no exchange rate.";
        Responses[403] = "Only administrators can delete rates.";
        Responses[404] = "No rate was entered by hand for that currency and date.";
    }
}
