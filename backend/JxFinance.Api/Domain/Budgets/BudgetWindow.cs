using JxFinance.Domain.Settings;

namespace JxFinance.Domain.Budgets;

public readonly record struct BudgetWindow(BudgetPeriod Period, DateOnly Start, DateOnly End)
{
    public const int MaxCarryWindows = 12;

    public DateOnly LastDay => End.AddDays(-1);

    public bool Contains(DateOnly date) => date >= Start && date < End;

    public static BudgetWindow For(DateOnly date, BudgetPeriod period, FirstDayOfWeek firstDayOfWeek) =>
        FromStart(period, StartOn(date, period, firstDayOfWeek));

    public BudgetWindow Shift(int windows) => FromStart(Period, ShiftStart(Start, Period, windows));

    private static BudgetWindow FromStart(BudgetPeriod period, DateOnly start) =>
        new(period, start, ShiftStart(start, period, 1));

    private static DateOnly StartOn(DateOnly date, BudgetPeriod period, FirstDayOfWeek firstDayOfWeek) => period switch
    {
        BudgetPeriod.Weekly => date.AddDays(-DaysIntoWeek(date, firstDayOfWeek)),
        BudgetPeriod.Monthly => new DateOnly(date.Year, date.Month, 1),
        BudgetPeriod.Quarterly => new DateOnly(date.Year, (((date.Month - 1) / 3) * 3) + 1, 1),
        BudgetPeriod.Yearly => new DateOnly(date.Year, 1, 1),
        _ => throw new ArgumentOutOfRangeException(nameof(period)),
    };

    private static DateOnly ShiftStart(DateOnly start, BudgetPeriod period, int windows) => period switch
    {
        BudgetPeriod.Weekly => start.AddDays(7 * windows),
        BudgetPeriod.Monthly => start.AddMonths(windows),
        BudgetPeriod.Quarterly => start.AddMonths(3 * windows),
        BudgetPeriod.Yearly => start.AddYears(windows),
        _ => throw new ArgumentOutOfRangeException(nameof(period)),
    };

    private static int DaysIntoWeek(DateOnly date, FirstDayOfWeek firstDayOfWeek)
    {
        var first = firstDayOfWeek == FirstDayOfWeek.Sunday ? DayOfWeek.Sunday : DayOfWeek.Monday;
        return ((int)date.DayOfWeek - (int)first + 7) % 7;
    }
}
