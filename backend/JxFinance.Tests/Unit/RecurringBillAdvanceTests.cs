using JxFinance.Domain.RecurringBills;

namespace JxFinance.Tests.Unit;

public sealed class RecurringBillAdvanceTests
{
    [Theory]
    [InlineData("2026-01-31", RecurringBillCadence.Monthly, 31, "2026-02-28")]
    [InlineData("2026-02-28", RecurringBillCadence.Monthly, 31, "2026-03-31")]
    [InlineData("2026-03-31", RecurringBillCadence.Monthly, 31, "2026-04-30")]
    [InlineData("2026-11-30", RecurringBillCadence.Quarterly, 30, "2027-02-28")]
    [InlineData("2027-02-28", RecurringBillCadence.Quarterly, 30, "2027-05-30")]
    [InlineData("2024-02-29", RecurringBillCadence.Yearly, 29, "2025-02-28")]
    [InlineData("2027-02-28", RecurringBillCadence.Yearly, 29, "2028-02-29")]
    [InlineData("2026-01-31", RecurringBillCadence.Weekly, 31, "2026-02-07")]
    [InlineData("2026-05-15", RecurringBillCadence.Monthly, 15, "2026-06-15")]
    public void Advance_returns_to_the_anchor_day_after_a_short_month(
        string from,
        RecurringBillCadence cadence,
        int anchorDay,
        string expected) =>
        Assert.Equal(DateOnly.Parse(expected), RecurringBill.Advance(DateOnly.Parse(from), cadence, anchorDay));
}
