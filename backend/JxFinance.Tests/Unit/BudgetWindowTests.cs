using JxFinance.Domain.Budgets;
using JxFinance.Domain.Settings;

namespace JxFinance.Tests.Unit;

public sealed class BudgetWindowTests
{
    [Theory]
    [InlineData("2026-09-20", BudgetPeriod.Weekly, FirstDayOfWeek.Monday, "2026-09-14", "2026-09-20")]
    [InlineData("2026-09-20", BudgetPeriod.Weekly, FirstDayOfWeek.Sunday, "2026-09-20", "2026-09-26")]
    [InlineData("2026-09-14", BudgetPeriod.Weekly, FirstDayOfWeek.Monday, "2026-09-14", "2026-09-20")]
    [InlineData("2026-09-14", BudgetPeriod.Weekly, FirstDayOfWeek.Sunday, "2026-09-13", "2026-09-19")]
    [InlineData("2026-01-01", BudgetPeriod.Weekly, FirstDayOfWeek.Monday, "2025-12-29", "2026-01-04")]
    [InlineData("2026-09-20", BudgetPeriod.Monthly, FirstDayOfWeek.Monday, "2026-09-01", "2026-09-30")]
    [InlineData("2026-02-28", BudgetPeriod.Monthly, FirstDayOfWeek.Monday, "2026-02-01", "2026-02-28")]
    [InlineData("2026-09-20", BudgetPeriod.Quarterly, FirstDayOfWeek.Monday, "2026-07-01", "2026-09-30")]
    [InlineData("2026-01-01", BudgetPeriod.Quarterly, FirstDayOfWeek.Monday, "2026-01-01", "2026-03-31")]
    [InlineData("2026-12-31", BudgetPeriod.Quarterly, FirstDayOfWeek.Monday, "2026-10-01", "2026-12-31")]
    [InlineData("2026-09-20", BudgetPeriod.Yearly, FirstDayOfWeek.Sunday, "2026-01-01", "2026-12-31")]
    public void Window_covers_the_period_that_holds_the_date(
        string date,
        BudgetPeriod period,
        FirstDayOfWeek firstDayOfWeek,
        string expectedStart,
        string expectedLastDay)
    {
        var window = BudgetWindow.For(DateOnly.Parse(date), period, firstDayOfWeek);

        Assert.Equal((DateOnly.Parse(expectedStart), DateOnly.Parse(expectedLastDay)), (window.Start, window.LastDay));
        Assert.True(window.Contains(DateOnly.Parse(date)));
        Assert.False(window.Contains(window.Start.AddDays(-1)));
        Assert.False(window.Contains(window.End));
    }

    [Theory]
    [InlineData(BudgetPeriod.Weekly, "2026-09-14", -1, "2026-09-07")]
    [InlineData(BudgetPeriod.Weekly, "2026-09-14", -12, "2026-06-22")]
    [InlineData(BudgetPeriod.Monthly, "2026-01-01", -1, "2025-12-01")]
    [InlineData(BudgetPeriod.Monthly, "2026-09-01", -12, "2025-09-01")]
    [InlineData(BudgetPeriod.Quarterly, "2026-07-01", -3, "2025-10-01")]
    [InlineData(BudgetPeriod.Yearly, "2026-01-01", -2, "2024-01-01")]
    public void Shift_steps_whole_windows_backwards(
        BudgetPeriod period,
        string start,
        int windows,
        string expectedStart)
    {
        var window = BudgetWindow.For(DateOnly.Parse(start), period, FirstDayOfWeek.Monday);

        Assert.Equal(DateOnly.Parse(expectedStart), window.Shift(windows).Start);
    }

    [Fact]
    public void Consecutive_windows_meet_without_a_gap_or_an_overlap()
    {
        var window = BudgetWindow.For(new DateOnly(2026, 9, 20), BudgetPeriod.Quarterly, FirstDayOfWeek.Monday);

        Assert.Equal(window.Start, window.Shift(-1).End);
        Assert.Equal(window.End, window.Shift(1).Start);
    }
}
