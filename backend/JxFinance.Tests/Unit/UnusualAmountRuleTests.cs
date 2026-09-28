using JxFinance.Common.Unusual;
using JxFinance.Domain.Transactions;

namespace JxFinance.Tests.Unit;

public sealed class UnusualAmountRuleTests
{
    private static readonly decimal[] SteadyPayee = [40m, 42m, 44m, 41m];

    [Fact]
    public void Too_little_history_says_nothing()
    {
        Assert.Null(UnusualAmountRule.Evaluate(500m, [40m, 42m, 44m], UnusualBasis.Payee));
        Assert.Null(UnusualAmountRule.Evaluate(500m, [40m, 42m, 44m, 41m, 40m, 42m, 44m], UnusualBasis.Category));
    }

    [Fact]
    public void Three_times_the_usual_amount_is_flagged_with_its_factor()
    {
        var verdict = UnusualAmountRule.Evaluate(126m, SteadyPayee, UnusualBasis.Payee);

        Assert.NotNull(verdict);
        Assert.Equal(UnusualBasis.Payee, verdict.Basis);
        Assert.Equal(41.5m, verdict.TypicalAmount);
        Assert.Equal(3.04m, verdict.Factor);
        Assert.Equal(4, verdict.SampleSize);
    }

    [Fact]
    public void A_flat_history_flags_anything_twice_as_large_and_ten_more()
    {
        decimal[] flat = [20m, 20m, 20m, 20m];

        Assert.NotNull(UnusualAmountRule.Evaluate(40m, flat, UnusualBasis.Payee));
        Assert.Null(UnusualAmountRule.Evaluate(39.99m, flat, UnusualBasis.Payee));
    }

    [Fact]
    public void A_noisy_history_needs_more_than_twice_the_median()
    {
        decimal[] noisy = [10m, 60m, 20m, 90m, 30m, 15m, 70m, 25m];

        Assert.Null(UnusualAmountRule.Evaluate(100m, noisy, UnusualBasis.Category));
        Assert.NotNull(UnusualAmountRule.Evaluate(400m, noisy, UnusualBasis.Category));
    }

    [Theory]
    [InlineData(13.99)]
    [InlineData(14.00)]
    public void Small_amounts_need_ten_units_above_the_median(decimal amount)
    {
        var history = Enumerable.Repeat(4m, 4).ToList();

        var verdict = UnusualAmountRule.Evaluate(amount, history, UnusualBasis.Payee);

        Assert.Equal(amount - 4m >= 10m, verdict is not null);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void A_median_that_is_not_positive_says_nothing(decimal value)
    {
        Assert.Null(UnusualAmountRule.Evaluate(100m, [value, value, value, value], UnusualBasis.Payee));
    }

    [Theory]
    [InlineData(9.99, 10.50, true)]
    [InlineData(9.99, 10.49, false)]
    [InlineData(100, 103, false)]
    [InlineData(100, 103.01, true)]
    [InlineData(5, 5.50, false)]
    [InlineData(5, 5.51, true)]
    public void A_price_rise_is_three_percent_and_fifty_cents(decimal expected, decimal charged, bool rise)
    {
        Assert.Equal(rise, PriceRiseRule.IsRise(charged, expected));
    }

    [Fact]
    public void A_variable_entry_expects_the_median_of_earlier_charges()
    {
        Assert.Equal(20m, PriceRiseRule.Expected(null, [20m, 21m, 19m]));
        Assert.Equal(9.99m, PriceRiseRule.Expected(9.99m, [20m]));
        Assert.Null(PriceRiseRule.Expected(null, []));
    }
}
