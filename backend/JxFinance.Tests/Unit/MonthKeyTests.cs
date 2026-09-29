using JxFinance.Common;

namespace JxFinance.Tests.Unit;

public sealed class MonthKeyTests
{
    [Theory]
    [InlineData("2026-08", 2026, 8)]
    [InlineData(" 2000-01 ", 2000, 1)]
    public void A_year_and_month_parse_to_the_first_day(string text, int year, int month)
    {
        var parsed = MonthKey.Parse(text);

        Assert.True(parsed.IsSuccess);
        Assert.Equal(new DateOnly(year, month, 1), parsed.Value);
    }

    [Theory]
    [InlineData("2026-13")]
    [InlineData("2026-8")]
    [InlineData("2026-08-01")]
    [InlineData("1999-12")]
    [InlineData("August")]
    [InlineData("")]
    [InlineData(null)]
    public void Anything_else_is_an_invalid_month(string? text)
    {
        var parsed = MonthKey.Parse(text);

        Assert.True(parsed.IsFailure);
        Assert.Equal("month.invalid", parsed.Error.Code);
    }
}
