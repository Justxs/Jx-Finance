using JxFinance.Common;

namespace JxFinance.Endpoints.Reports.Shared;

public static class ComparisonWindow
{
    public static DateWindow? For(ReportComparisonMode mode, DateWindow period) => mode switch
    {
        ReportComparisonMode.PreviousPeriod => new DateWindow(period.Start.AddDays(-period.Days), period.Start),
        ReportComparisonMode.PreviousYear => Shifted(period, 12),
        ReportComparisonMode.PreviousMonth => Shifted(period, 1),
        _ => null,
    };

    private static DateWindow Shifted(DateWindow period, int months)
    {
        var end = period.InclusiveEnd;
        var shifted = end.AddMonths(-months);
        return DateWindow.Inclusive(period.Start.AddMonths(-months), IsMonthEnd(end) ? LastDayOf(shifted) : shifted);
    }

    private static bool IsMonthEnd(DateOnly date) => date.Day == DateTime.DaysInMonth(date.Year, date.Month);

    private static DateOnly LastDayOf(DateOnly date) => new(date.Year, date.Month, DateTime.DaysInMonth(date.Year, date.Month));
}
