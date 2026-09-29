using FastEndpoints;

namespace JxFinance.Endpoints.MonthCloses.ReopenMonth;

public sealed class ReopenMonthSummary : Summary<ReopenMonthEndpoint>
{
    public ReopenMonthSummary()
    {
        Summary = "Reopen a closed month";
        Description = "Deletes the close and its snapshot in the household scope you are viewing. The month's "
            + "transactions are not touched. Reopening a month that is not closed does nothing.";
        Params["month"] = "The month as YYYY-MM.";
        Responses[204] = "The month is open.";
        Responses[400] = "month.invalid: the month is not a YYYY-MM value between 2000 and 2999.";
    }
}
