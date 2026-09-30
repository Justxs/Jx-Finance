using JxFinance.Common.RecurringBills;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Tests.Unit;

public sealed class RecurringOccurrencesTests
{
    private static readonly DateOnly LongAgo = new(2000, 1, 1);

    [Theory]
    [InlineData(RecurringBillCadence.Weekly, "2027-01-04", "2027-01-01", "2027-01-31", "2027-01-04,2027-01-11,2027-01-18,2027-01-25")]
    [InlineData(RecurringBillCadence.Monthly, "2027-01-31", "2027-02-01", "2027-04-30", "2027-02-28,2027-03-31,2027-04-30")]
    [InlineData(RecurringBillCadence.Quarterly, "2026-11-30", "2027-01-01", "2027-06-30", "2027-02-28,2027-05-30")]
    [InlineData(RecurringBillCadence.Yearly, "2024-02-29", "2025-01-01", "2028-12-31", "2025-02-28,2026-02-28,2027-02-28,2028-02-29")]
    public void After_walks_forward_from_the_next_due_date_keeping_the_anchor_day(
        RecurringBillCadence cadence,
        string due,
        string from,
        string to,
        string expected)
    {
        var bill = Bill(DateOnly.Parse(due), cadence);

        Assert.Equal(Dates(expected), RecurringOccurrences.After(bill, DateOnly.Parse(from), DateOnly.Parse(to)));
    }

    [Theory]
    [InlineData(RecurringBillCadence.Weekly, "2027-02-01", "2027-01-01", "2027-01-31", "2027-01-04,2027-01-11,2027-01-18,2027-01-25")]
    [InlineData(RecurringBillCadence.Monthly, "2027-03-31", "2027-01-01", "2027-02-28", "2027-01-31,2027-02-28")]
    [InlineData(RecurringBillCadence.Quarterly, "2027-05-30", "2026-10-01", "2027-03-31", "2026-11-30,2027-02-28")]
    [InlineData(RecurringBillCadence.Yearly, "2028-02-29", "2024-01-01", "2027-12-31", "2024-02-29,2025-02-28,2026-02-28,2027-02-28")]
    public void Before_walks_back_from_the_next_due_date_keeping_the_anchor_day(
        RecurringBillCadence cadence,
        string due,
        string from,
        string to,
        string expected)
    {
        var bill = Bill(DateOnly.Parse(due), cadence);

        Assert.Equal(Dates(expected), RecurringOccurrences.Before(bill, DateOnly.Parse(from), DateOnly.Parse(to), LongAgo));
    }

    [Fact]
    public void A_range_across_the_next_due_date_is_split_between_before_and_after()
    {
        var bill = Bill(new DateOnly(2027, 2, 15), RecurringBillCadence.Monthly);
        var from = new DateOnly(2027, 1, 1);
        var to = new DateOnly(2027, 3, 31);

        Assert.Equal([new DateOnly(2027, 1, 15)], RecurringOccurrences.Before(bill, from, to, LongAgo));
        Assert.Equal([new DateOnly(2027, 2, 15), new DateOnly(2027, 3, 15)], RecurringOccurrences.After(bill, from, to));
    }

    [Fact]
    public void Before_never_goes_before_the_entry_was_created()
    {
        var bill = Bill(new DateOnly(2027, 3, 15), RecurringBillCadence.Monthly);

        var dates = RecurringOccurrences.Before(bill, new DateOnly(2026, 12, 1), new DateOnly(2027, 3, 31), new DateOnly(2027, 1, 20));

        Assert.Equal([new DateOnly(2027, 2, 15)], dates);
    }

    [Fact]
    public void Both_directions_stop_at_the_cap()
    {
        var bill = Bill(new DateOnly(2027, 1, 4), RecurringBillCadence.Weekly);

        var after = RecurringOccurrences.After(bill, new DateOnly(2027, 1, 1), new DateOnly(2030, 1, 1));
        var before = RecurringOccurrences.Before(bill, new DateOnly(2024, 1, 1), new DateOnly(2027, 1, 31), LongAgo);

        Assert.Equal(RecurringOccurrences.MaxOccurrences, after.Count);
        Assert.Equal(new DateOnly(2027, 1, 4), after[0]);
        Assert.Equal(RecurringOccurrences.MaxOccurrences, before.Count);
        Assert.Equal(new DateOnly(2026, 12, 28), before[^1]);
    }

    private static RecurringBill Bill(DateOnly due, RecurringBillCadence cadence)
    {
        var bill = new RecurringBill { Name = "Rent", Cadence = cadence, Amount = 100m };
        bill.Schedule(due);
        return bill;
    }

    private static List<DateOnly> Dates(string list) => [.. list.Split(',').Select(DateOnly.Parse)];
}
