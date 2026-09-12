using JxFinance.Common;

namespace JxFinance.Tests.Unit;

public sealed class MoneyWireTests
{
    [Theory]
    [InlineData("12.50", true)]
    [InlineData("-12.50", true)]
    [InlineData("12,50", false)]
    [InlineData("1,000.00", false)]
    [InlineData("0.001", false)]
    [InlineData("10000000000000000.00", false)]
    [InlineData("NaN", false)]
    public void Wire_money_is_exact_and_culture_independent(string value, bool valid) => Assert.Equal(valid, MoneyWire.IsValid(value));
}
