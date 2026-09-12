using FastEndpoints;

namespace JxFinance.Endpoints.Dashboard.GetDashboardSummary;

public sealed class GetDashboardSummarySummary : Summary<GetDashboardSummaryEndpoint>
{
    public GetDashboardSummarySummary()
    {
        Summary = "Get the dashboard summary";
        Description = "Returns the headline figures for the current month: total balance across all "
            + "visible accounts, income and expenses so far, and the resulting net flow. The month is "
            + "resolved in the instance time zone, not the caller's.";
        Responses[200] = "The current-month totals.";
    }
}
