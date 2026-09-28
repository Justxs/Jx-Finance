using System.Globalization;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Imports.Matching;

namespace JxFinance.Tests.Unit;

public sealed class ManualEntryMatcherTests
{
    private static readonly DateOnly Day = new(2026, 9, 10);

    [Theory]
    [InlineData(3)]
    [InlineData(-3)]
    public void An_entry_matches_the_same_type_and_amount_within_three_days(int days)
    {
        var entry = Entry(Day.AddDays(days));

        Assert.Same(entry, ManualEntryMatcher.Match([Line(Day)], [entry]).Single());
    }

    [Theory]
    [InlineData(4, "12.50", FlowType.Expense, Currency.Eur)]
    [InlineData(-4, "12.50", FlowType.Expense, Currency.Eur)]
    [InlineData(0, "12.51", FlowType.Expense, Currency.Eur)]
    [InlineData(0, "12.50", FlowType.Income, Currency.Eur)]
    [InlineData(0, "12.50", FlowType.Expense, Currency.Usd)]
    public void An_entry_that_differs_in_date_amount_type_or_currency_is_not_offered(
        int days,
        string amount,
        FlowType type,
        Currency currency)
    {
        var entry = new ManualEntry(TransactionId.New(), Day.AddDays(days), type, new Money(decimal.Parse(amount, CultureInfo.InvariantCulture), currency));

        Assert.Null(ManualEntryMatcher.Match([Line(Day)], [entry]).Single());
    }

    [Fact]
    public void Each_entry_goes_to_one_line_and_the_closest_date_wins()
    {
        var early = Entry(Day);
        var late = Entry(Day.AddDays(2));

        var matched = ManualEntryMatcher.Match([Line(Day.AddDays(2)), Line(Day), Line(Day.AddDays(1))], [early, late]);

        Assert.Equal([late, early, null], matched);
    }

    [Fact]
    public void A_skipped_line_is_never_matched()
    {
        var entry = Entry(Day);

        Assert.Equal([null, entry], ManualEntryMatcher.Match([null, Line(Day)], [entry]));
    }

    private static StatementLine Line(DateOnly date) => new(date, FlowType.Expense, new Money(12.50m, Currency.Eur));

    private static ManualEntry Entry(DateOnly date) => new(TransactionId.New(), date, FlowType.Expense, new Money(12.5m, Currency.Eur));
}
