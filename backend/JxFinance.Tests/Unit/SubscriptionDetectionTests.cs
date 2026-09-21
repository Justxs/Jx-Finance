using System.Globalization;
using JxFinance.Common.Subscriptions;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Tests.Unit;

public sealed class SubscriptionDetectionTests
{
    [Theory]
    [InlineData("2026-01-05 2026-01-12 2026-01-19", RecurringBillCadence.Weekly)]
    [InlineData("2026-01-05 2026-02-05 2026-03-05", RecurringBillCadence.Monthly)]
    [InlineData("2026-01-31 2026-02-28 2026-03-31", RecurringBillCadence.Monthly)]
    [InlineData("2025-10-01 2026-01-02 2026-04-01", RecurringBillCadence.Quarterly)]
    [InlineData("2024-03-14 2025-03-14 2026-03-14", RecurringBillCadence.Yearly)]
    public void A_steady_gap_names_its_cadence(string dates, RecurringBillCadence expected) =>
        Assert.Equal(expected, SubscriptionDetection.CadenceOf(Dates(dates)));

    [Theory]
    [InlineData("2026-01-05 2026-02-05")]
    [InlineData("2026-01-05 2026-02-05 2026-02-19")]
    [InlineData("2026-01-05 2026-01-12 2026-03-05")]
    [InlineData("2026-01-05 2026-02-05 2026-03-20")]
    public void An_uneven_or_short_series_names_no_cadence(string dates) =>
        Assert.Null(SubscriptionDetection.CadenceOf(Dates(dates)));

    [Theory]
    [InlineData("9.99 9.99 9.99", "9.99")]
    [InlineData("9.99 10.49 10.99", "10.49")]
    [InlineData("10.00 10.00 10.00 11.00", "10.00")]
    [InlineData("20.00 60.00 140.00", null)]
    [InlineData("10.00 10.00 10.00 12.00", null)]
    public void Amounts_are_typical_only_while_they_stay_near_their_median(string amounts, string? expected)
    {
        var typical = SubscriptionDetection.TypicalAmount(Amounts(amounts));

        Assert.Equal(expected is null ? null : decimal.Parse(expected, CultureInfo.InvariantCulture), typical);
    }

    private static List<DateOnly> Dates(string dates) => dates
        .Split(' ')
        .Select(date => DateOnly.ParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture))
        .ToList();

    private static List<decimal> Amounts(string amounts) => amounts
        .Split(' ')
        .Select(amount => decimal.Parse(amount, CultureInfo.InvariantCulture))
        .ToList();
}
