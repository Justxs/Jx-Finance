using FastEndpoints;

namespace JxFinance.Endpoints.Investments.GetTaxSummary;

public sealed class GetTaxSummarySummary : Summary<GetTaxSummaryEndpoint, GetTaxSummaryRequest>
{
    public GetTaxSummarySummary()
    {
        Summary = "Get the yearly investment tax summary";
        Description = "Returns one calendar year of recorded investment activity on the accounts the caller can see: "
            + "every disposal with its proceeds, first-in-first-out cost basis, gain or loss and the acquisition date, "
            + "quantity and cost of each lot it consumed, and every dividend, interest, withholding tax and standalone "
            + "fee of that year. Every amount is given both in the currency it was recorded in and in the reporting "
            + "currency at the rate frozen on the entry's date; withholding tax and fees are reported as positive "
            + "amounts paid. AvailableYears lists the years that hold anything, newest first, and Year falls back to the "
            + "newest of them, or to the current year when nothing is recorded. A year with nothing recorded answers an "
            + "empty summary rather than an error. This is a summary of recorded data, not tax advice: no tax, "
            + "allowance or rate is applied.";
        RequestParam(r => r.Year, "The calendar year to report. Defaults to the newest year that holds anything.");
        RequestParam(
            r => r.AccountIds,
            "Up to 50 account ids separated by commas. Defaults to every account the caller can see.");
        Responses[200] = "The summary of the year.";
    }
}
