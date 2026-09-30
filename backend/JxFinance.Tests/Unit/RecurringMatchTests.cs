using JxFinance.Common.RecurringBills;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Tests.Unit;

public sealed class RecurringMatchTests
{
    private static readonly AccountId Account = new(Guid.Parse("11111111-1111-1111-1111-111111111111"));
    private static readonly DateOnly Due = new(2027, 1, 15);

    [Theory]
    [InlineData(RecurringBillCadence.Monthly, 5, true)]
    [InlineData(RecurringBillCadence.Monthly, -5, true)]
    [InlineData(RecurringBillCadence.Monthly, 6, false)]
    [InlineData(RecurringBillCadence.Weekly, 2, true)]
    [InlineData(RecurringBillCadence.Weekly, -3, false)]
    public void A_row_pays_an_occurrence_within_the_tolerance(RecurringBillCadence cadence, int daysOff, bool paid)
    {
        var occurrence = new ScheduledOccurrence(Bill(1, cadence), Due);

        var assigned = RecurringMatch.Assign([occurrence], [Row(Due.AddDays(daysOff))]);

        Assert.Equal(paid, assigned.ContainsKey(occurrence));
    }

    [Fact]
    public void A_row_on_another_account_or_with_another_text_pays_nothing()
    {
        var occurrence = new ScheduledOccurrence(Bill(1, RecurringBillCadence.Monthly), Due);

        var assigned = RecurringMatch.Assign(
            [occurrence],
            [Row(Due) with { AccountId = new AccountId(Guid.NewGuid()) }, Row(Due) with { Key = "gym" }]);

        Assert.Empty(assigned);
    }

    [Fact]
    public void A_row_pays_the_nearest_occurrence()
    {
        var early = new ScheduledOccurrence(Bill(1, RecurringBillCadence.Monthly), Due.AddDays(-3));
        var near = new ScheduledOccurrence(Bill(2, RecurringBillCadence.Monthly), Due.AddDays(1));
        var row = Row(Due);

        var assigned = RecurringMatch.Assign([early, near], [row]);

        Assert.Equal(row, Assert.Single(assigned, pair => pair.Key == near).Value);
        Assert.False(assigned.ContainsKey(early));
    }

    [Fact]
    public void One_row_between_two_entries_pays_the_lower_entry_id_on_a_tie()
    {
        var higher = new ScheduledOccurrence(Bill(2, RecurringBillCadence.Monthly), Due.AddDays(1));
        var lower = new ScheduledOccurrence(Bill(1, RecurringBillCadence.Monthly), Due.AddDays(-1));

        var assigned = RecurringMatch.Assign([higher, lower], [Row(Due)]);

        Assert.Equal(lower, Assert.Single(assigned).Key);
    }

    [Fact]
    public void Two_rows_for_one_occurrence_leave_the_farther_one_unused()
    {
        var occurrence = new ScheduledOccurrence(Bill(1, RecurringBillCadence.Monthly), Due);
        var near = Row(Due.AddDays(1), 30m);

        var assigned = RecurringMatch.Assign([occurrence], [Row(Due.AddDays(-2), 20m), near]);

        Assert.Equal(near, Assert.Single(assigned).Value);
    }

    [Fact]
    public void An_entry_without_an_account_is_paid_on_any_account()
    {
        var bill = Bill(1, RecurringBillCadence.Monthly);
        bill.AccountId = null;
        var occurrence = new ScheduledOccurrence(bill, Due);

        var assigned = RecurringMatch.Assign([occurrence], [Row(Due) with { AccountId = new AccountId(Guid.NewGuid()) }]);

        Assert.True(assigned.ContainsKey(occurrence));
    }

    private static RecurringBill Bill(int id, RecurringBillCadence cadence)
    {
        var bill = new RecurringBill
        {
            Id = new RecurringBillId(new Guid(id, 0, 0, new byte[8])),
            Name = "Rent",
            Cadence = cadence,
            Amount = 100m,
            AccountId = Account,
        };
        bill.Schedule(Due);
        return bill;
    }

    private static RecurringRow Row(DateOnly date, decimal amount = 100m) =>
        new(RecurringBillShape.Expense, Guid.NewGuid(), Account, null, date, amount, Currency.Eur, amount, "rent");
}
