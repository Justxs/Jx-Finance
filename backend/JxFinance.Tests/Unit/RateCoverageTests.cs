using JxFinance.Domain.ExchangeRates;

namespace JxFinance.Tests.Unit;

public sealed class RateCoverageTests
{
    private const int MaxGapDays = 5;

    private static readonly DateOnly Start = new(2024, 1, 1);
    private static readonly DateOnly End = new(2024, 1, 31);

    [Fact]
    public void An_empty_history_leaves_the_whole_range_uncovered()
    {
        var gaps = RateCoverage.Uncovered([], Start, End, MaxGapDays);

        Assert.Equal([new DateRange(Start, End)], gaps);
    }

    [Fact]
    public void Weekends_between_business_days_need_no_fetch()
    {
        var gaps = RateCoverage.Uncovered(BusinessDays(Start.AddDays(-3), End), Start, End, MaxGapDays);

        Assert.Empty(gaps);
    }

    [Fact]
    public void A_hole_longer_than_the_allowed_gap_is_fetched_alone()
    {
        var known = BusinessDays(Start.AddDays(-3), End)
            .Where(date => date < new DateOnly(2024, 1, 8) || date > new DateOnly(2024, 1, 20))
            .ToList();

        var gaps = RateCoverage.Uncovered(known, Start, End, MaxGapDays);

        Assert.Equal([new DateRange(new DateOnly(2024, 1, 6), new DateOnly(2024, 1, 21))], gaps);
    }

    [Fact]
    public void A_history_that_stops_early_is_topped_up_to_the_end()
    {
        var known = BusinessDays(Start.AddDays(-3), new DateOnly(2024, 1, 10));

        var gaps = RateCoverage.Uncovered(known, Start, End, MaxGapDays);

        Assert.Equal([new DateRange(new DateOnly(2024, 1, 11), End)], gaps);
    }

    [Fact]
    public void A_history_that_stops_within_the_allowed_gap_is_left_alone()
    {
        var known = BusinessDays(Start.AddDays(-3), End.AddDays(-2));

        var gaps = RateCoverage.Uncovered(known, Start, End, MaxGapDays);

        Assert.Empty(gaps);
    }

    [Fact]
    public void Only_rates_before_the_range_still_anchor_its_start()
    {
        var gaps = RateCoverage.Uncovered([Start.AddDays(-2)], Start, End, MaxGapDays);

        Assert.Equal([new DateRange(Start, End)], gaps);
    }

    private static List<DateOnly> BusinessDays(DateOnly from, DateOnly to) =>
        Enumerable.Range(0, to.DayNumber - from.DayNumber + 1)
            .Select(from.AddDays)
            .Where(date => date.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday))
            .ToList();
}
