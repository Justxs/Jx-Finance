using FastEndpoints;

namespace JxFinance.Endpoints.Dashboard.GetMonthlyTrend;

public sealed class GetMonthlyTrendSummary : Summary<GetMonthlyTrendEndpoint, GetMonthlyTrendRequest>
{
    public GetMonthlyTrendSummary()
    {
        Summary = "Get the monthly income and expense trend";
        Description = "Returns income and expense totals per month, oldest first, ending with the "
            + "requested month. Months with no activity are still present with zero totals so the chart "
            + "keeps an even x-axis. While the investments feature is on, the totals include investment "
            + "dividends and interest as income and withholding tax and standalone fees as expense.";
        RequestParam(r => r.Months, "How many months to include, counting back from the last one. Defaults to 6.");
        RequestParam(r => r.Month, "Last month to include as YYYY-MM. Defaults to the current month.");
        Responses[200] = "One entry per month in the requested window.";
        Responses[400] = "Validation failed: month.invalid, the month is not a YYYY-MM value between 2000 and 2999.";
    }
}
