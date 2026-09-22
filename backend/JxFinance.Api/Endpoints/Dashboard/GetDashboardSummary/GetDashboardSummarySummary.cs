using FastEndpoints;

namespace JxFinance.Endpoints.Dashboard.GetDashboardSummary;

public sealed class GetDashboardSummarySummary : Summary<GetDashboardSummaryEndpoint>
{
    public GetDashboardSummarySummary()
    {
        Summary = "Get the dashboard summary";
        Description = "Returns the headline figures for the current month: total balance across all "
            + "visible accounts, income and expenses so far, and the resulting net flow. The month is "
            + "resolved in the instance time zone, not the caller's. While the investments feature is on, "
            + "income includes dividends and interest from the investment ledger and expenses include "
            + "withholding tax and standalone fees, exactly as in the report summary. IsComplete is false when a "
            + "balance or holding could not be valued and the total balance leaves it out.";
        Responses[200] = "The current-month totals.";
    }
}
