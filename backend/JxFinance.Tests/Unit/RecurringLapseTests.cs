using JxFinance.Common.RecurringBills;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Tests.Unit;

public sealed class RecurringLapseTests
{
    private static readonly AccountId Account = new(Guid.Parse("11111111-1111-1111-1111-111111111111"));
    private static readonly DateOnly Today = new(2027, 3, 20);

    [Fact]
    public void Two_past_occurrences_without_a_row_mark_the_entry()
    {
        var occurrences = Monthly(new DateOnly(2027, 1, 10), new DateOnly(2027, 2, 10));

        Assert.True(RecurringLapse.PossiblyCancelled(occurrences, Assign(occurrences), Today));
    }

    [Fact]
    public void A_row_on_either_of_the_last_two_occurrences_clears_the_mark()
    {
        var occurrences = Monthly(new DateOnly(2027, 1, 10), new DateOnly(2027, 2, 10));

        Assert.False(RecurringLapse.PossiblyCancelled(occurrences, Assign(occurrences, new DateOnly(2027, 2, 12)), Today));
        Assert.False(RecurringLapse.PossiblyCancelled(occurrences, Assign(occurrences, new DateOnly(2027, 1, 8)), Today));
    }

    [Fact]
    public void Only_the_last_two_past_occurrences_count()
    {
        var occurrences = Monthly(new DateOnly(2026, 12, 10), new DateOnly(2027, 1, 10), new DateOnly(2027, 2, 10));

        Assert.True(RecurringLapse.PossiblyCancelled(occurrences, Assign(occurrences, new DateOnly(2026, 12, 10)), Today));
    }

    [Fact]
    public void One_missed_occurrence_is_not_enough()
    {
        var occurrences = Monthly(new DateOnly(2027, 2, 10));

        Assert.False(RecurringLapse.PossiblyCancelled(occurrences, Assign(occurrences), Today));
    }

    [Fact]
    public void An_occurrence_whose_matching_window_is_still_open_does_not_count_yet()
    {
        var occurrences = Monthly(new DateOnly(2027, 2, 10), new DateOnly(2027, 3, 16));

        Assert.False(RecurringLapse.PossiblyCancelled(occurrences, Assign(occurrences), Today));
        Assert.True(RecurringLapse.PossiblyCancelled(occurrences, Assign(occurrences), Today.AddDays(2)));
    }

    [Fact]
    public void A_future_occurrence_does_not_count()
    {
        var occurrences = Monthly(new DateOnly(2027, 2, 10), new DateOnly(2027, 4, 10));

        Assert.False(RecurringLapse.PossiblyCancelled(occurrences, Assign(occurrences), Today));
    }

    [Fact]
    public void A_weekly_entry_lapses_after_two_missed_weeks_with_its_shorter_window()
    {
        var bill = Bill(RecurringBillCadence.Weekly);
        var occurrences = new[] { new ScheduledOccurrence(bill, Today.AddDays(-10)), new ScheduledOccurrence(bill, Today.AddDays(-3)) };

        Assert.True(RecurringLapse.PossiblyCancelled(occurrences, Assign(occurrences), Today));
    }

    private static ScheduledOccurrence[] Monthly(params DateOnly[] dates)
    {
        var bill = Bill(RecurringBillCadence.Monthly);
        return [.. dates.Select(date => new ScheduledOccurrence(bill, date))];
    }

    private static IReadOnlyDictionary<ScheduledOccurrence, RecurringRow> Assign(
        IReadOnlyList<ScheduledOccurrence> occurrences,
        params DateOnly[] paidOn) =>
        RecurringMatch.Assign(
            occurrences,
            paidOn.Select(date => new RecurringRow(RecurringBillShape.Expense, Guid.NewGuid(), Account, null, date, 9.99m, Currency.Eur, 9.99m, "netflix")));

    private static RecurringBill Bill(RecurringBillCadence cadence)
    {
        var bill = new RecurringBill
        {
            Id = new RecurringBillId(Guid.NewGuid()),
            Name = "Netflix",
            Cadence = cadence,
            Amount = 9.99m,
            AccountId = Account,
        };
        bill.Schedule(Today);
        return bill;
    }
}
