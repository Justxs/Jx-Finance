using FastEndpoints;
using JxFinance.Endpoints.Investments.GetTaxSummary;

namespace JxFinance.Endpoints.Investments.ExportTaxSummary;

public sealed class ExportTaxSummarySummary : Summary<ExportTaxSummaryEndpoint, GetTaxSummaryRequest>
{
    public ExportTaxSummarySummary()
    {
        Summary = "Export the yearly investment tax summary as CSV";
        Description = "Answers the same year as GET /api/investments/tax-summary as a CSV attachment named "
            + "investment-tax-summary-<year>.csv. Rows are written to the response as they are produced, so the answer "
            + "carries no Content-Length. The Section column says what a row is: a Disposal row, one Lot row per lot "
            + "that disposal consumed, and one Dividend, Interest, WithholdingTax or Fee row per cash entry. Every row "
            + "carries the amount in the currency it was recorded in and again in the reporting currency at the frozen "
            + "rate. There are no total rows: every row is a recorded entry. This is a summary of recorded data, not "
            + "tax advice.";
        RequestParam(r => r.Year, "The calendar year to report. Defaults to the newest year that holds anything.");
        RequestParam(
            r => r.AccountIds,
            "Up to 50 account ids separated by commas. Defaults to every account the caller can see.");
        Responses[200] = "The CSV file.";
    }
}
