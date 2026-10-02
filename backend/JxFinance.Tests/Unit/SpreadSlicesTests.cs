using System.Globalization;
using JxFinance.Common.Spreads;
using JxFinance.Domain.Transactions;

namespace JxFinance.Tests.Unit;

public sealed class SpreadSlicesTests
{
    [Theory]
    [InlineData("360.00", 12)]
    [InlineData("100.00", 3)]
    [InlineData("0.10", 12)]
    [InlineData("1000.01", 7)]
    [InlineData("0.01", 36)]
    [InlineData("99999.99", 36)]
    public void The_slices_add_up_to_the_amount_and_differ_by_at_most_a_cent(string amount, int months)
    {
        var slices = SpreadSlices.Of(new DateOnly(2026, 1, 15), Parse(amount), months);

        Assert.Equal(months, slices.Count);
        Assert.Equal(Parse(amount), slices.Sum(slice => slice.Amount));
        Assert.All(slices, slice => Assert.True(slice.Amount >= 0m));
        Assert.True(slices.Max(slice => slice.Amount) - slices.Min(slice => slice.Amount) <= 0.01m);
    }

    [Fact]
    public void Ten_cents_over_twelve_months_hands_out_one_cent_to_the_first_ten()
    {
        var slices = SpreadSlices.Of(new DateOnly(2026, 1, 1), 0.10m, 12);
        decimal[] expected = [.. Enumerable.Repeat(0.01m, 10), 0m, 0m];

        Assert.Equal(expected, slices.Select(slice => slice.Amount));
    }

    [Fact]
    public void Each_slice_falls_on_the_same_day_of_the_following_months()
    {
        var slices = SpreadSlices.Of(new DateOnly(2026, 1, 15), 360m, 12);

        Assert.Equal(
            Enumerable.Range(0, 12).Select(offset => new DateOnly(2026, 1 + offset, 15)),
            slices.Select(slice => slice.Date));
        Assert.All(slices, slice => Assert.Equal(30m, slice.Amount));
    }

    [Theory]
    [InlineData(2027, 28)]
    [InlineData(2028, 29)]
    public void The_thirty_first_of_january_clamps_to_the_end_of_february(int year, int lastDayOfFebruary)
    {
        var slices = SpreadSlices.Of(new DateOnly(year, 1, 31), 30m, 3);
        DateOnly[] expected = [new DateOnly(year, 1, 31), new DateOnly(year, 2, lastDayOfFebruary), new DateOnly(year, 3, 31)];

        Assert.Equal(expected, slices.Select(slice => slice.Date));
    }

    [Fact]
    public void Thirty_six_months_reach_three_years_ahead()
    {
        var slices = SpreadSlices.Of(new DateOnly(2026, 3, 10), 3600m, 36);

        Assert.Equal(36, slices.Count);
        Assert.Equal(new DateOnly(2029, 2, 10), slices[^1].Date);
        Assert.All(slices, slice => Assert.Equal(100m, slice.Amount));
    }

    [Theory]
    [InlineData("2026-01-31", 2)]
    [InlineData("2026-01-31", 13)]
    [InlineData("2027-12-15", 3)]
    [InlineData("2028-02-29", 12)]
    [InlineData("2026-03-10", 36)]
    public void Until_is_the_date_of_the_last_slice(string date, int months)
    {
        var start = DateOnly.Parse(date, CultureInfo.InvariantCulture);

        Assert.Equal(SpreadSlices.Of(start, 100m, months)[^1].Date, SpreadSlices.Range(start, months, SpreadDirection.Forward).Until);
    }

    [Fact]
    public void A_backward_spread_ends_on_the_payment_and_reaches_back_with_the_day_clamped()
    {
        var slices = SpreadSlices.Of(new DateOnly(2026, 3, 31), 90m, 3, SpreadDirection.Backward);

        DateOnly[] expected = [new DateOnly(2026, 1, 31), new DateOnly(2026, 2, 28), new DateOnly(2026, 3, 31)];
        Assert.Equal(expected, slices.Select(slice => slice.Date));
        Assert.All(slices, slice => Assert.Equal(30m, slice.Amount));
    }

    [Fact]
    public void A_negative_amount_is_spread_as_negative_slices_that_add_up()
    {
        var slices = SpreadSlices.Of(new DateOnly(2026, 1, 15), -100m, 3, SpreadDirection.Backward);

        Assert.Equal([-33.34m, -33.33m, -33.33m], slices.Select(slice => slice.Amount));
        Assert.Equal(-100m, slices.Sum(slice => slice.Amount));
    }

    [Theory]
    [InlineData("2026-03-31", 3, SpreadDirection.Forward, "2026-03-31", "2026-05-31")]
    [InlineData("2026-03-31", 3, SpreadDirection.Backward, "2026-01-31", "2026-03-31")]
    [InlineData("2026-01-15", 12, SpreadDirection.Backward, "2025-02-15", "2026-01-15")]
    [InlineData("2026-01-15", 1, SpreadDirection.Backward, "2026-01-15", "2026-01-15")]
    public void The_range_runs_from_the_first_slice_to_the_last_in_either_direction(string date, int months, SpreadDirection direction, string from, string until)
    {
        var start = DateOnly.Parse(date, CultureInfo.InvariantCulture);
        var slices = SpreadSlices.Of(start, 100m, months, direction);

        var range = SpreadSlices.Range(start, months, direction);

        Assert.Equal((DateOnly.Parse(from, CultureInfo.InvariantCulture), DateOnly.Parse(until, CultureInfo.InvariantCulture)), range);
        Assert.Equal((slices[0].Date, slices[^1].Date), range);
    }

    private static decimal Parse(string value) => decimal.Parse(value, CultureInfo.InvariantCulture);
}
