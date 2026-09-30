using System.Text;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Brokers.InteractiveBrokers;
using JxFinance.Infrastructure.Brokers.TradeCsv;

namespace JxFinance.Tests.Unit;

public sealed class TradeCsvParserTests
{
    private const string Csv = """
        Date;Type;Symbol;Name;ISIN;Security type;Quantity;Price;Amount;Fee;Currency
        2026-03-02;buy;vwce;Vanguard FTSE All-World;IE00BK5BQT80;etf;10;110,50;;1,00;EUR
        2026-06-15;sell;VWCE;;;;4;118.25;;0.5;EUR
        2026-06-20;dividend;VWCE;;;;;;3,20;;EUR
        2026-06-20;tax;VWCE;;;;;;0,48;;EUR
        2026-06-30;fee;;;;;;;2,00;;EUR
        2026-07-01;swap;VWCE;;;;;;;;EUR
        """;

    [Fact]
    public void Trades_carry_signed_proceeds_and_the_fee_as_a_negative_commission()
    {
        var statement = Parse(Csv);

        Assert.Equal(
            [
                ("VWCE", 10m, 110.50m, -1105.00m, -1.00m, "STK", "ETF"),
                ("VWCE", -4m, 118.25m, 473.00m, -0.5m, "STK", null),
            ],
            statement.Trades.Select(t => (t.Instrument.Symbol, t.Quantity, t.Price, t.Proceeds, t.Commission, t.Instrument.AssetCategory, t.Instrument.SubCategory)));
        Assert.Equal("IE00BK5BQT80", statement.Trades[0].Instrument.Isin);
        Assert.All(statement.Trades, t => Assert.Equal(Currency.Eur, t.CommissionCurrency));
    }

    [Fact]
    public void Cash_rows_take_the_sign_of_their_type_and_unknown_types_are_counted()
    {
        var statement = Parse(Csv);

        Assert.Equal(
            [("Dividends", 3.20m, "VWCE"), ("Withholding Tax", -0.48m, "VWCE"), ("Other Fees", -2.00m, null)],
            statement.CashTransactions.Select(c => (c.Type, c.Amount, c.Instrument?.Symbol)));
        Assert.Equal(1, statement.Unreadable);
    }

    [Fact]
    public void The_same_rows_get_the_same_ids_and_repeated_rows_are_told_apart()
    {
        const string twice = "Date,Type,Symbol,Quantity,Price,Currency\n2026-01-05,buy,AAPL,1,200,USD\n2026-01-05,buy,AAPL,1,200,USD\n";

        var first = Parse(twice);
        var second = Parse(twice);

        Assert.Equal(first.Trades.Select(t => t.Id), second.Trades.Select(t => t.Id));
        Assert.NotEqual(first.Trades[0].Id, first.Trades[1].Id);
    }

    [Fact]
    public void A_file_without_the_required_columns_is_refused()
    {
        var result = TradeCsvParser.Parse(new MemoryStream(Encoding.UTF8.GetBytes("Symbol,Quantity\nAAPL,1")));

        Assert.Equal(ErrorCodes.ImportInvalidFile, result.Error.Code);
    }

    private static FlexStatement Parse(string text) =>
        TradeCsvParser.Parse(new MemoryStream(Encoding.UTF8.GetBytes(text))).Value!;
}
