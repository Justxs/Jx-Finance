using System.Globalization;
using System.Text.Json;
using FluentValidation;
using JxFinance.Common.Json;
using JxFinance.Common.Validation;

namespace JxFinance.Tests.Unit;

public sealed class DecimalStringJsonTests
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    [Theory]
    [InlineData("\"12.50\"", "12.50")]
    [InlineData("\"-12.50\"", "-12.50")]
    [InlineData("\"0.001\"", "0.001")]
    public void Decimal_strings_are_read_exactly(string token, string expected)
    {
        var sample = JsonSerializer.Deserialize<Sample>($$"""{"amount":{{token}},"quantity":{{token}}}""", Options)!;

        Assert.Equal(decimal.Parse(expected, CultureInfo.InvariantCulture), sample.Amount);
        Assert.Equal(sample.Amount, sample.Quantity);
    }

    [Theory]
    [InlineData("\"12,50\"")]
    [InlineData("\"1,000.00\"")]
    [InlineData("\"NaN\"")]
    [InlineData("\"\"")]
    [InlineData("\" 12.50\"")]
    [InlineData("\"1e3\"")]
    [InlineData("\"abc\"")]
    [InlineData("12.50")]
    [InlineData("true")]
    public void Anything_but_an_invariant_decimal_string_is_refused_and_names_the_property(string token)
    {
        var money = Assert.Throws<DecimalStringException>(() => JsonSerializer.Deserialize<Sample>($$"""{"amount":{{token}}}""", Options));
        var quantity = Assert.Throws<DecimalStringException>(() => JsonSerializer.Deserialize<Sample>($$"""{"quantity":{{token}}}""", Options));

        Assert.Equal("$.amount", money.Path);
        Assert.Equal(DecimalString.Invalid, money.Message);
        Assert.Equal("$.quantity", quantity.Path);
    }

    [Fact]
    public void Money_is_written_with_two_decimals_and_quantity_without_trailing_zeros()
    {
        var json = JsonSerializer.Serialize(new Sample(12.5m, 2.50000000m, 1.005m, 0.123456789m), Options);

        Assert.Equal("""{"amount":"12.50","quantity":"2.5","optionalAmount":"1.01","optionalQuantity":"0.12345679"}""", json);
    }

    [Fact]
    public void Null_round_trips_for_optional_values()
    {
        var json = JsonSerializer.Serialize(new Sample(0m, 0m, null, null), Options);

        Assert.Equal("""{"amount":"0.00","quantity":"0","optionalAmount":null,"optionalQuantity":null}""", json);
        var sample = JsonSerializer.Deserialize<Sample>(json, Options)!;
        Assert.Null(sample.OptionalAmount);
        Assert.Null(sample.OptionalQuantity);
    }

    [Theory]
    [InlineData("12.50", true)]
    [InlineData("-12.50", true)]
    [InlineData("0.001", false)]
    [InlineData("9999999999999999.99", true)]
    [InlineData("10000000000000000.00", false)]
    public void Money_keeps_two_decimals_and_sixteen_digits(string value, bool valid) =>
        Assert.Equal(valid, DecimalRules.FitsMoney(decimal.Parse(value, CultureInfo.InvariantCulture)));

    [Theory]
    [InlineData("0.12345678", true)]
    [InlineData("0.123456789", false)]
    [InlineData("999999999999", true)]
    [InlineData("1000000000000", false)]
    public void Quantity_keeps_eight_decimals_and_twelve_digits(string value, bool valid) =>
        Assert.Equal(valid, DecimalRules.FitsQuantity(decimal.Parse(value, CultureInfo.InvariantCulture)));

    [Theory]
    [InlineData("0.00", true, false, true)]
    [InlineData("-0.01", true, false, false)]
    [InlineData("0.01", true, true, true)]
    [InlineData("0.001", false, false, false)]
    public void Sign_rules_build_on_the_scale_rule(string value, bool money, bool positive, bool nonNegative)
    {
        var amount = decimal.Parse(value, CultureInfo.InvariantCulture);

        Assert.Equal(money, new RuleProbe(r => r.IsMoney()).Validate(new Sample(amount, 0m)).IsValid);
        Assert.Equal(positive, new RuleProbe(r => r.IsPositiveMoney()).Validate(new Sample(amount, 0m)).IsValid);
        Assert.Equal(nonNegative, new RuleProbe(r => r.IsNonNegativeMoney()).Validate(new Sample(amount, 0m)).IsValid);
    }

    private sealed record Sample(
        [property: Money] decimal Amount,
        [property: Quantity] decimal Quantity,
        [property: Money] decimal? OptionalAmount = null,
        [property: Quantity] decimal? OptionalQuantity = null);

    private sealed class RuleProbe : AbstractValidator<Sample>
    {
        public RuleProbe(Action<IRuleBuilderInitial<Sample, decimal>> rule) => rule(RuleFor(s => s.Amount));
    }
}
