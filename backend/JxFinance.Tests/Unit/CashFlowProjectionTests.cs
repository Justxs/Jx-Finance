using JxFinance.Domain.RecurringBills;
using JxFinance.Endpoints.Accounts.GetCashFlowForecast;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Tests.Unit;

public sealed class CashFlowProjectionTests
{
    private static readonly DateOnly Today = new(2027, 1, 15);

    [Fact]
    public void A_monthly_entry_anchored_on_the_31st_keeps_its_day_after_february()
    {
        var bill = Bill(new DateOnly(2027, 1, 31), RecurringBillCadence.Monthly);

        var dates = Dates(CashFlowProjection.Occurrences(bill, Today, Today.AddDays(90), []));

        Assert.Equal([new(2027, 1, 31), new(2027, 2, 28), new(2027, 3, 31)], dates);
    }

    [Fact]
    public void A_weekly_entry_repeats_every_seven_days()
    {
        var bill = Bill(Today.AddDays(3), RecurringBillCadence.Weekly);

        var dates = Dates(CashFlowProjection.Occurrences(bill, Today, Today.AddDays(30), []));

        Assert.Equal([Today.AddDays(3), Today.AddDays(10), Today.AddDays(17), Today.AddDays(24)], dates);
    }

    [Fact]
    public void An_overdue_occurrence_is_placed_on_today()
    {
        var bill = Bill(Today.AddDays(-10), RecurringBillCadence.Monthly);

        var occurrences = CashFlowProjection.Occurrences(bill, Today, Today.AddDays(30), []);

        Assert.Equal(new ForecastOccurrence(Today, true), occurrences[0]);
        Assert.Equal(new ForecastOccurrence(Today.AddDays(-10).AddMonths(1), false), occurrences[1]);
    }

    [Theory]
    [InlineData(RecurringBillCadence.Monthly, 5, true)]
    [InlineData(RecurringBillCadence.Monthly, 6, false)]
    [InlineData(RecurringBillCadence.Weekly, 2, true)]
    [InlineData(RecurringBillCadence.Weekly, 3, false)]
    public void A_matching_row_close_before_the_due_date_skips_the_first_occurrence(
        RecurringBillCadence cadence,
        int daysAhead,
        bool skipped)
    {
        var due = Today.AddDays(daysAhead);
        var bill = Bill(due, cadence);

        var occurrences = CashFlowProjection.Occurrences(bill, Today, Today.AddDays(60), [Today]);

        Assert.Equal(skipped ? RecurringBill.Advance(due, cadence, due.Day) : due, occurrences[0].Date);
    }

    [Fact]
    public void A_matching_row_after_today_does_not_skip_an_occurrence()
    {
        var bill = Bill(Today.AddDays(2), RecurringBillCadence.Monthly);

        var occurrences = CashFlowProjection.Occurrences(bill, Today, Today.AddDays(60), [Today.AddDays(1)]);

        Assert.Equal(Today.AddDays(2), occurrences[0].Date);
    }

    [Fact]
    public void An_occurrence_on_the_last_day_of_the_horizon_is_included()
    {
        var bill = Bill(Today.AddDays(30), RecurringBillCadence.Monthly);

        var occurrences = CashFlowProjection.Occurrences(bill, Today, Today.AddDays(30), []);

        Assert.Equal(Today.AddDays(30), Assert.Single(occurrences).Date);
    }

    [Fact]
    public void Occurrences_stop_at_the_cap()
    {
        var bill = Bill(Today.AddDays(-1000), RecurringBillCadence.Weekly);

        var occurrences = CashFlowProjection.Occurrences(bill, Today, Today.AddDays(90), []);

        Assert.Equal(CashFlowProjection.MaxOccurrences, occurrences.Count);
        Assert.All(occurrences, occurrence => Assert.Equal(new ForecastOccurrence(Today, true), occurrence));
    }

    [Fact]
    public void The_estimate_is_the_median_of_the_newest_six()
    {
        decimal[] newestFirst = [100m, 10m, 20m, 30m, 40m, 50m, 60m];
        var matches = newestFirst
            .Select((amount, index) => (Today.AddMonths(-index), amount))
            .Reverse();

        Assert.Equal(35m, CashFlowProjection.Estimate(matches));
        Assert.Null(CashFlowProjection.Estimate([]));
    }

    [Fact]
    public void Usual_spending_is_the_median_daily_rate_of_three_months()
    {
        (DateOnly, decimal)[] months = [(new(2026, 10, 1), 310m), (new(2026, 11, 1), 600m), (new(2026, 12, 1), 3100m)];

        Assert.Equal(20m, CashFlowProjection.UsualDailySpending(months));
        Assert.Null(CashFlowProjection.UsualDailySpending(months[..2]));
    }

    [Fact]
    public void The_balance_goes_below_zero_on_the_day_it_first_ends_negative()
    {
        var projection = CashFlowProjection.Project(
            100m,
            [Change(Today.AddDays(5), -80m), Change(Today.AddDays(3), -60m), Change(Today.AddDays(5), 30m)],
            null,
            Today,
            Today.AddDays(30));

        Assert.Equal(Today.AddDays(5), projection.BelowZeroOn);
        Assert.Null(projection.BelowZeroWithSpendingOn);
        Assert.Equal(-10m, projection.LowestBalance);
        Assert.Equal(Today.AddDays(5), projection.LowestOn);
        Assert.Equal([-60m, 30m, -80m], projection.Entries.Select(e => e.Amount));
        Assert.Equal([40m, 70m, -10m], projection.Entries.Select(e => e.BalanceAfter));
    }

    [Fact]
    public void Usual_spending_can_cross_zero_before_the_schedule_does()
    {
        var projection = CashFlowProjection.Project(
            100m,
            [Change(Today.AddDays(20), -90m)],
            10m,
            Today,
            Today.AddDays(30));

        Assert.Null(projection.BelowZeroOn);
        Assert.Equal(Today.AddDays(11), projection.BelowZeroWithSpendingOn);
        Assert.Equal(10m, projection.LowestBalance);
        Assert.Equal(Today.AddDays(20), projection.LowestOn);
    }

    [Fact]
    public void A_balance_already_below_zero_is_below_zero_today()
    {
        var projection = CashFlowProjection.Project(-5m, [Change(Today.AddDays(1), 50m)], 1m, Today, Today.AddDays(30));

        Assert.Equal(Today, projection.BelowZeroOn);
        Assert.Equal(Today, projection.BelowZeroWithSpendingOn);
        Assert.Equal(-5m, projection.LowestBalance);
        Assert.Equal(Today, projection.LowestOn);
    }

    private static RecurringBill Bill(DateOnly due, RecurringBillCadence cadence)
    {
        var bill = new RecurringBill { Name = "Rent", Cadence = cadence, Amount = 100m };
        bill.Schedule(due);
        return bill;
    }

    private static ForecastEntryResponse Change(DateOnly date, decimal amount) =>
        new(date, ForecastEntrySource.Recurring, Guid.NewGuid(), "Rent", RecurringBillShape.Expense, amount, false, false, 0m);

    private static List<DateOnly> Dates(IEnumerable<ForecastOccurrence> occurrences) =>
        occurrences.Select(occurrence => occurrence.Date).ToList();
}
