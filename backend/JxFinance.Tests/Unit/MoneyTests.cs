using JxFinance.Domain.Common;

namespace JxFinance.Tests.Unit;

public sealed class MoneyTests
{
    [Theory]
    [InlineData("1.005", "1.01")]
    [InlineData("-1.005", "-1.01")]
    [InlineData("1.004", "1.00")]
    [InlineData("2.675", "2.68")]
    public void Amounts_round_half_away_from_zero_to_cents(string raw, string expected) =>
        Assert.Equal(decimal.Parse(expected), new Money(decimal.Parse(raw), Currency.Eur).Amount);

    [Fact]
    public void Arithmetic_keeps_the_currency()
    {
        var total = new Money(10.10m, Currency.Usd) + new Money(0.05m, Currency.Usd) - new Money(0.15m, Currency.Usd);

        Assert.Equal(new Money(10.00m, Currency.Usd), total);
        Assert.Equal(new Money(-10.00m, Currency.Usd), -total);
    }

    [Fact]
    public void Mixing_currencies_is_refused()
    {
        Assert.Throws<InvalidOperationException>(() => new Money(1m, Currency.Eur) + new Money(1m, Currency.Usd));
        Assert.Throws<InvalidOperationException>(() => new Money(1m, Currency.Eur) - new Money(1m, Currency.Usd));
    }
}
