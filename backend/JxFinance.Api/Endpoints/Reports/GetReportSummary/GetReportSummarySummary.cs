using FastEndpoints;

namespace JxFinance.Endpoints.Reports.GetReportSummary;

public sealed class GetReportSummarySummary : Summary<GetReportSummaryEndpoint, GetReportSummaryRequest>
{
    public GetReportSummarySummary()
    {
        Summary = "Summarise income and expenses over a range";
        Description = "Returns income, expense, and net totals for an arbitrary date range, with the "
            + "per-category split. Unlike the dashboard endpoints, the window is yours to choose rather "
            + "than being pinned to calendar months.";
        RequestParam(r => r.DateFrom, "Inclusive start date as YYYY-MM-DD. Defaults to the start of the current month.");
        RequestParam(r => r.DateTo, "Inclusive end date as YYYY-MM-DD. Defaults to today.");
        Responses[200] = "Totals and the per-category split for the range.";
    }
}
