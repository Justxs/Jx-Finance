using JxFinance.Common.Journal;
using JxFinance.Tests.Support.Journal;

namespace JxFinance.Tests.Unit;

public sealed class BeancountCommodityTests
{
    private static readonly Guid First = Guid.Parse("0a1b2c3d-0000-0000-0000-000000000001");
    private static readonly Guid Second = Guid.Parse("f9e8d7c6-0000-0000-0000-000000000002");

    [Theory]
    [InlineData("AAPL", "AAPL")]
    [InlineData("vwce.de", "VWCE.DE")]
    [InlineData("BRK-B", "BRK-B")]
    [InlineData(" 7203 ", "X0A1B2C3D")]
    [InlineData("BRK B", "X0A1B2C3D")]
    [InlineData("F", "X0A1B2C3D")]
    [InlineData("ABC-", "X0A1B2C3D")]
    [InlineData("ÄPPLE", "X0A1B2C3D")]
    [InlineData("ABCDEFGHIJKLMNOPQRSTUVWXY", "X0A1B2C3D")]
    public void A_symbol_is_used_upper_cased_when_it_is_a_valid_commodity(string symbol, string commodity)
    {
        var names = BeancountCommodity.Names([(First, symbol)]);

        Assert.Equal(commodity, names[First]);
        Assert.True(JournalChecker.IsCommodity(commodity));
    }

    [Theory]
    [InlineData("EUR")]
    [InlineData("usd")]
    [InlineData("GBP")]
    public void A_symbol_equal_to_a_currency_code_is_replaced(string symbol)
    {
        Assert.Equal("X0A1B2C3D", BeancountCommodity.Names([(First, symbol)])[First]);
    }

    [Fact]
    public void One_symbol_in_two_currencies_names_neither_security_after_it()
    {
        var names = BeancountCommodity.Names([(First, "SHEL"), (Second, "shel")]);

        Assert.Equal("X0A1B2C3D", names[First]);
        Assert.Equal("XF9E8D7C6", names[Second]);
    }

    [Fact]
    public void A_replacement_that_collides_with_a_symbol_takes_a_longer_id()
    {
        var names = BeancountCommodity.Names([(First, "X0A1B2C3D"), (Second, "EUR")]);
        var third = Guid.Parse("0a1b2c3d-1111-0000-0000-000000000003");

        var colliding = BeancountCommodity.Names([(First, "X0A1B2C3D"), (third, "USD")]);

        Assert.Equal("X0A1B2C3D", names[First]);
        Assert.Equal("XF9E8D7C6", names[Second]);
        Assert.Equal("X0A1B2C3D111100000000000", colliding[third]);
        Assert.True(JournalChecker.IsCommodity(colliding[third]));
    }
}
