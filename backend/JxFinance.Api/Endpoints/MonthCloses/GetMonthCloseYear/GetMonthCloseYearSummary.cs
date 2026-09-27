using FastEndpoints;

namespace JxFinance.Endpoints.MonthCloses.GetMonthCloseYear;

public sealed class GetMonthCloseYearSummary : Summary<GetMonthCloseYearEndpoint, GetMonthCloseYearRequest>
{
    public GetMonthCloseYearSummary()
    {
        Summary = "List the close status of every month in a year";
        Description = "Answers twelve entries, January to December, each with its status: notEnded while the "
            + "month is still running in the installation time zone, open when it has ended and is not closed, "
            + "closed, or closedChanged when a transaction or investment entry dated in that month was created, "
            + "edited, deleted or moved out of it after the close, its total income or expense differs from the "
            + "snapshot, or the reporting currency changed since. Closes are yours alone "
            + "and belong to the household scope you are viewing, so switching the active household shows that "
            + "scope's closes. The month review also compares each category.";
        RequestParam(r => r.Year, "The calendar year, from 2000 to 2999. Defaults to the current year.");
        Responses[200] = "Twelve month statuses.";
        Responses[400] = "monthClose.invalidMonth: the year is outside the supported range.";
    }
}
