using FastEndpoints;

namespace JxFinance.Endpoints.Dashboard.GetDashboardSummary;

public sealed class GetDashboardSummarySummary : Summary<GetDashboardSummaryEndpoint, GetDashboardSummaryRequest>
{
    public GetDashboardSummarySummary()
    {
        Summary = "Get the dashboard summary";
        Description = "Returns the headline figures for one month: total balance across all visible "
            + "accounts as of the month's last day, or as of today for the current month, and the month's "
            + "income, expenses and resulting net flow. The month defaults to the current one, resolved in the "
            + "instance time zone, not the caller's. A past month's balance counts only rows dated on or before "
            + "its last day and values currencies and holdings at the rates and prices of that day. While the "
            + "investments feature is on, income includes dividends and interest from the investment ledger and "
            + "expenses include withholding tax and standalone fees, exactly as in the report summary. "
            + "IsComplete is false when a balance or holding could not be valued and the total balance leaves it out.";
        RequestParam(r => r.Month, "Month to report on as YYYY-MM. Defaults to the current month.");
        Responses[200] = "The month's totals and the total balance at the month's end.";
        Responses[400] = "Validation failed: month.invalid, the month is not a YYYY-MM value between 2000 and 2999.";
    }
}
