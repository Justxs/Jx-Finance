using JxFinance.Domain.Common;
using JxFinance.Domain.ExchangeRates;

namespace JxFinance.Tests.Unit;

public class RateTableTests
{
    private static readonly RateTable Table = new(
        new DateOnly(2026, 9, 1),
        new Dictionary<Currency, decimal> { [Currency.Usd] = 1.10m, [Currency.Gbp] = 0.80m });

    [Fact]
    public void Same_currency_converts_one_to_one()
    {
        Assert.Equal(12.34m, Table.Convert(12.34m, Currency.Usd, Currency.Usd));
    }

    [Fact]
    public void Euro_converts_with_the_quoted_rate()
    {
        Assert.Equal(110.00m, Table.Convert(100m, Currency.Eur, Currency.Usd));
        Assert.Equal(100.00m, Table.Convert(110m, Currency.Usd, Currency.Eur));
    }

    [Fact]
    public void Two_foreign_currencies_cross_through_the_euro()
    {
        Assert.Equal(80.00m, Table.Convert(110m, Currency.Usd, Currency.Gbp));
    }

    [Fact]
    public void Missing_rate_gives_no_answer()
    {
        Assert.Null(Table.Convert(10m, Currency.Pln, Currency.Eur));
        Assert.Null(RateTable.Empty.Rate(Currency.Usd, Currency.Eur));
    }

    [Fact]
    public void Converting_there_and_back_returns_the_amount_within_a_cent()
    {
        var random = new Random(20260919);
        Currency[] currencies = [Currency.Eur, Currency.Usd, Currency.Gbp];

        for (var i = 0; i < 500; i++)
        {
            var amount = Math.Round((decimal)random.NextDouble() * 100_000m, 2);
            var from = currencies[random.Next(currencies.Length)];
            var to = currencies[random.Next(currencies.Length)];

            var there = Table.Convert(amount, from, to)!.Value;
            var back = Table.Convert(there, to, from)!.Value;

            Assert.InRange(back - amount, -0.01m, 0.01m);
        }
    }

    [Fact]
    public void Inverse_rates_multiply_to_one()
    {
        var product = Table.Rate(Currency.Usd, Currency.Gbp)!.Value * Table.Rate(Currency.Gbp, Currency.Usd)!.Value;

        Assert.InRange(product, 0.99999m, 1.00001m);
    }

    [Theory]
    [InlineData("usd", true)]
    [InlineData("EUR", true)]
    [InlineData("xxx", false)]
    [InlineData("12", false)]
    [InlineData(null, false)]
    public void Currency_codes_parse_case_insensitively(string? code, bool expected)
    {
        Assert.Equal(expected, CurrencyCode.TryParse(code, out _));
    }
}
