using FastEndpoints;

namespace JxFinance.Endpoints.Dashboard.GetMonthlyTrend;

public sealed class GetMonthlyTrendSummary : Summary<GetMonthlyTrendEndpoint, GetMonthlyTrendRequest>
{
    public GetMonthlyTrendSummary()
    {
        Summary = "Get the monthly income and expense trend";
        Description = "Returns income and expense totals per month, oldest first, ending with the "
            + "current month. Months with no activity are still present with zero totals so the chart "
            + "keeps an even x-axis.";
        RequestParam(r => r.Months, "How many months to include, counting back from the current one. Defaults to 6.");
        Responses[200] = "One entry per month in the requested window.";
    }
}
