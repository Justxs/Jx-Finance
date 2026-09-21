using JxFinance.Common;

namespace JxFinance.Endpoints.Reports.Shared;

public static class ComparisonWindow
{
    public static DateWindow? For(ReportComparisonMode mode, DateWindow period) => mode switch
    {
        ReportComparisonMode.PreviousPeriod => new DateWindow(period.Start.AddDays(-period.Days), period.Start),
        ReportComparisonMode.PreviousYear => PreviousYear(period),
        _ => null,
    };

    private static DateWindow PreviousYear(DateWindow period)
    {
        var end = period.InclusiveEnd;
        var shifted = end.AddYears(-1);
        var lastDayOfItsMonth = end.Day == DateTime.DaysInMonth(end.Year, end.Month);
        var earlierEnd = lastDayOfItsMonth
            ? new DateOnly(shifted.Year, shifted.Month, DateTime.DaysInMonth(shifted.Year, shifted.Month))
            : shifted;

        return DateWindow.Inclusive(period.Start.AddYears(-1), earlierEnd);
    }
}
