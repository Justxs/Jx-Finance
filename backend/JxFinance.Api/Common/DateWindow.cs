namespace JxFinance.Common;

public readonly record struct DateWindow(DateOnly Start, DateOnly ExclusiveEnd)
{
    public static DateWindow Inclusive(DateOnly start, DateOnly end) => new(start, end.AddDays(1));

    public DateOnly InclusiveEnd => ExclusiveEnd.AddDays(-1);

    public int Days => ExclusiveEnd.DayNumber - Start.DayNumber;

    public bool Contains(DateOnly date) => date >= Start && date < ExclusiveEnd;
}
