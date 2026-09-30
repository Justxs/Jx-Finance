using System.Text;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.MarketPrices;

namespace JxFinance.Tests.Unit;

public sealed class PriceCsvParserTests
{
    [Fact]
    public void Reads_dot_and_comma_decimals_and_counts_bad_lines()
    {
        var file = Parse("""
            Date;Price
            2026-09-25;139,30
            2026-09-28;139.62
            29.09.2026;1.234,5
            yesterday;140
            2026-09-30;
            2026-10-01;-3
            """);

        Assert.True(file.IsSuccess);
        Assert.Equal(
            [
                new PricePoint(new DateOnly(2026, 9, 25), 139.30m),
                new PricePoint(new DateOnly(2026, 9, 28), 139.62m),
                new PricePoint(new DateOnly(2026, 9, 29), 1234.5m),
            ],
            file.Value!.Points);
        Assert.Equal(3, file.Value.Unreadable);
    }

    [Fact]
    public void Columns_are_found_by_name_in_any_order()
    {
        var file = Parse("""
            price,volume,date
            12.5,100,2026-09-25
            """);

        Assert.Equal([new PricePoint(new DateOnly(2026, 9, 25), 12.5m)], file.Value!.Points);
    }

    [Fact]
    public void A_file_without_a_price_column_is_refused()
    {
        Assert.Equal(ErrorCodes.ImportMissingColumns, Parse("date;close\n2026-09-25;12\n").ErrorCode);
    }

    [Fact]
    public void An_empty_file_is_refused()
    {
        Assert.Equal(ErrorCodes.ImportInvalidFile, Parse("").ErrorCode);
    }

    private static Result<PriceFile> Parse(string csv) =>
        PriceCsvParser.Parse(new MemoryStream(Encoding.UTF8.GetBytes(csv)));
}
