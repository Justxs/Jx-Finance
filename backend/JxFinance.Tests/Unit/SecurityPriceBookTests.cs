using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Endpoints.Investments.Services;

namespace JxFinance.Tests.Unit;

public sealed class SecurityPriceBookTests
{
    private static readonly DateOnly Monday = new(2026, 9, 28);

    [Theory]
    [InlineData(PriceSourceKind.Manual)]
    [InlineData(PriceSourceKind.Broker)]
    [InlineData(PriceSourceKind.File)]
    public async Task A_fetched_price_never_replaces_another_source_and_leaves_the_last_price_alone(PriceSourceKind stored)
    {
        await using var capture = new SqlCapture();
        var security = new Security { Currency = Currency.Eur, LastPrice = 10m, LastPriceDate = Monday.AddDays(-1) };
        var existing = new SecurityPrice { SecurityId = security.Id, Date = Monday, Price = 12m, Source = stored };

        var changed = SecurityPriceBook.Record(capture.Db, security, Monday, 99m, PriceSourceKind.Feed, existing);

        Assert.False(changed);
        Assert.Equal((12m, stored), (existing.Price, existing.Source));
        Assert.Equal((10m, Monday.AddDays(-1)), (security.LastPrice!.Value, security.LastPriceDate!.Value));
    }

    [Theory]
    [InlineData(PriceSourceKind.Manual)]
    [InlineData(PriceSourceKind.Broker)]
    [InlineData(PriceSourceKind.File)]
    [InlineData(PriceSourceKind.Feed)]
    public async Task Any_price_replaces_a_fetched_one(PriceSourceKind incoming)
    {
        await using var capture = new SqlCapture();
        var security = new Security { Currency = Currency.Eur, LastPrice = 12m, LastPriceDate = Monday };
        var existing = new SecurityPrice { SecurityId = security.Id, Date = Monday, Price = 12m, Source = PriceSourceKind.Feed };

        var changed = SecurityPriceBook.Record(capture.Db, security, Monday, 13m, incoming, existing);

        Assert.True(changed);
        Assert.Equal((13m, incoming), (existing.Price, existing.Source));
        Assert.Equal(13m, security.LastPrice);
    }

    [Fact]
    public async Task A_hand_price_replaces_a_broker_price()
    {
        await using var capture = new SqlCapture();
        var security = new Security { Currency = Currency.Eur };
        var existing = new SecurityPrice { SecurityId = security.Id, Date = Monday, Price = 12m, Source = PriceSourceKind.Broker };

        Assert.True(SecurityPriceBook.Record(capture.Db, security, Monday, 11m, PriceSourceKind.Manual, existing));
        Assert.Equal((11m, PriceSourceKind.Manual), (existing.Price, existing.Source));
    }

    [Fact]
    public async Task A_fetched_price_on_a_new_day_is_added_with_its_source()
    {
        await using var capture = new SqlCapture();
        var security = new Security { Currency = Currency.Eur };

        Assert.True(SecurityPriceBook.Record(capture.Db, security, Monday, 50m, PriceSourceKind.Feed, null));

        var added = Assert.Single(capture.Db.SecurityPrices.Local);
        Assert.Equal((50m, PriceSourceKind.Feed), (added.Price, added.Source));
        Assert.Equal((50m, Monday), (security.LastPrice!.Value, security.LastPriceDate!.Value));
    }
}
