using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Investments.Services;
using JxFinance.Infrastructure.MarketPrices;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Unit;

public sealed class PriceSyncRulesTests
{
    private static readonly DateTimeOffset Wednesday = new(2026, 9, 30, 10, 0, 0, TimeSpan.Zero);
    private static readonly TestClock Clock = new(Wednesday);

    [Theory]
    [InlineData("2026-09-30", "2026-09-29")]
    [InlineData("2026-09-28", "2026-09-25")]
    [InlineData("2026-09-27", "2026-09-25")]
    [InlineData("2026-09-26", "2026-09-25")]
    public void The_target_is_the_last_weekday_before_today(string today, string target)
    {
        Assert.Equal(DateOnly.Parse(target), PriceSyncRules.Target(DateOnly.Parse(today)));
    }

    [Fact]
    public void A_security_never_fetched_is_due_even_with_a_current_price()
    {
        var security = Mapped(lastPrice: new DateOnly(2026, 9, 29), syncedAt: null);

        Assert.True(PriceSyncRules.IsDue(security, Clock, force: false));
    }

    [Fact]
    public void A_security_priced_on_the_target_day_is_not_due()
    {
        var security = Mapped(lastPrice: new DateOnly(2026, 9, 29), syncedAt: Wednesday.AddDays(-2));

        Assert.False(PriceSyncRules.IsDue(security, Clock, force: true));
    }

    [Fact]
    public void A_stale_security_is_asked_once_a_day()
    {
        var yesterday = Mapped(lastPrice: new DateOnly(2026, 9, 25), syncedAt: Wednesday.AddDays(-1));
        var earlierToday = Mapped(lastPrice: new DateOnly(2026, 9, 25), syncedAt: Wednesday.AddHours(-2));

        Assert.True(PriceSyncRules.IsDue(yesterday, Clock, force: false));
        Assert.False(PriceSyncRules.IsDue(earlierToday, Clock, force: false));
        Assert.True(PriceSyncRules.IsDue(earlierToday, Clock, force: true));
    }

    [Fact]
    public void A_failed_security_waits_a_day_unless_forced()
    {
        var failedRecently = Mapped(lastPrice: new DateOnly(2026, 9, 25), syncedAt: Wednesday.AddHours(-23), error: "EODHD refused: Ticker Not Found");
        var failedLongAgo = Mapped(lastPrice: new DateOnly(2026, 9, 25), syncedAt: Wednesday.AddHours(-25), error: "EODHD refused: Ticker Not Found");

        Assert.False(PriceSyncRules.IsDue(failedRecently, Clock, force: false));
        Assert.True(PriceSyncRules.IsDue(failedRecently, Clock, force: true));
        Assert.True(PriceSyncRules.IsDue(failedLongAgo, Clock, force: false));
    }

    [Fact]
    public void A_first_fetch_starts_at_the_first_trade_and_later_ones_after_the_last_price()
    {
        var firstTrade = new DateOnly(2026, 3, 2);

        Assert.Equal(firstTrade, PriceSyncRules.From(Mapped(new DateOnly(2026, 9, 25), null), hasFeedPrice: false, firstTrade));
        Assert.Equal(firstTrade, PriceSyncRules.From(Mapped(new DateOnly(2026, 9, 25), Wednesday), hasFeedPrice: false, firstTrade));
        Assert.Equal(new DateOnly(2026, 9, 26), PriceSyncRules.From(Mapped(new DateOnly(2026, 9, 25), Wednesday), hasFeedPrice: true, firstTrade));
    }

    [Fact]
    public void The_daily_budget_counts_calls_and_starts_again_the_next_day()
    {
        var today = new DateOnly(2026, 9, 30);
        var settings = new InstanceSettings();

        Assert.Equal(20, PriceSyncRules.CallsLeft(settings, today, 20));
        PriceSyncRules.Spend(settings, today, 2);
        PriceSyncRules.Spend(settings, today, 17);
        Assert.Equal(1, PriceSyncRules.CallsLeft(settings, today, 20));
        PriceSyncRules.Spend(settings, today, 1);
        Assert.Equal(0, PriceSyncRules.CallsLeft(settings, today, 20));

        Assert.Equal(20, PriceSyncRules.CallsLeft(settings, today.AddDays(1), 20));
        PriceSyncRules.Spend(settings, today.AddDays(1), 1);
        Assert.Equal((today.AddDays(1), 1), (settings.PriceCallsDate!.Value, settings.PriceCallsUsed));
    }

    [Fact]
    public void Pence_become_pounds_and_another_currency_is_refused()
    {
        var gbp = new Security { Symbol = "VWRP", Currency = Currency.Gbp, PriceSymbol = "VWRP.LSE" };
        var eur = new Security { Symbol = "VWCE", Currency = Currency.Eur, PriceSymbol = "VWCE.US" };

        var pounds = PriceSyncRules.InSecurityCurrency(gbp, [new MarketClose(new DateOnly(2026, 9, 28), 12134m, "GBX")]);
        var refused = PriceSyncRules.InSecurityCurrency(eur, [new MarketClose(new DateOnly(2026, 9, 28), 139.62m, "USD")]);

        Assert.Equal([new MarketClose(new DateOnly(2026, 9, 28), 121.34m, "GBP")], pounds.Value!);
        Assert.True(refused.IsFailure);
        Assert.Contains("USD", refused.ErrorMessage, StringComparison.Ordinal);
    }

    private static Security Mapped(DateOnly? lastPrice, DateTimeOffset? syncedAt, string? error = null) => new()
    {
        Symbol = "VWCE",
        Currency = Currency.Eur,
        PriceSource = PriceSource.Eodhd,
        PriceSymbol = "VWCE.XETRA",
        LastPrice = lastPrice is null ? null : 100m,
        LastPriceDate = lastPrice,
        PriceSyncedAt = syncedAt,
        PriceSyncError = error,
    };
}
