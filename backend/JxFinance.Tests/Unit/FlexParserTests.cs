using System.Text;
using JxFinance.Infrastructure.Brokers.InteractiveBrokers;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Unit;

public sealed class FlexParserTests
{
    [Fact]
    public async Task Report_is_read_without_order_and_summary_rows()
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(SampleFlexReport.Xml));

        var statement = (await FlexParser.ParseAsync(stream, CancellationToken.None)).Value!;

        Assert.Equal(5, statement.Trades.Count);
        Assert.Equal(4, statement.CashTransactions.Count);
        Assert.Equal(2, statement.OpenPositions.Count);
        Assert.Equal(new DateOnly(2026, 6, 4), statement.Trades.Single(t => t.Id == "1003").Date);
        Assert.False(statement.Trades.Single(t => t.Id == "1002").IsBuy);
    }

    [Fact]
    public async Task Content_that_is_not_a_flex_report_is_rejected()
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes("Statement,Header,Field Name"));

        Assert.True((await FlexParser.ParseAsync(stream, CancellationToken.None)).IsFailure);
    }
}
