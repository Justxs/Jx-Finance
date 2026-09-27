namespace JxFinance.Common;

public readonly record struct DateWindow(DateOnly Start, DateOnly ExclusiveEnd)
{
    private const int DailyUpToDays = 92;
    private const int WeeklyUpToDays = 731;

    public static DateWindow Inclusive(DateOnly start, DateOnly end) => new(start, end.AddDays(1));

    public static List<DateOnly> Sample(DateOnly start, DateOnly end)
    {
        var days = end.DayNumber - start.DayNumber;
        var dates = new List<DateOnly>();
        for (var index = 0; ; index++)
        {
            var date = days <= DailyUpToDays
                ? end.AddDays(-index)
                : days <= WeeklyUpToDays ? end.AddDays(-7 * index) : end.AddMonths(-index);
            if (date < start)
            {
                break;
            }

            dates.Add(date);
        }

        if (dates[^1] != start)
        {
            dates.Add(start);
        }

        dates.Reverse();
        return dates;
    }

    public static DateWindow MonthOf(DateOnly date)
    {
        var start = new DateOnly(date.Year, date.Month, 1);
        return new(start, start.AddMonths(1));
    }

    public DateOnly InclusiveEnd => ExclusiveEnd.AddDays(-1);

    public int Days => ExclusiveEnd.DayNumber - Start.DayNumber;

    public bool Contains(DateOnly date) => date >= Start && date < ExclusiveEnd;
}
