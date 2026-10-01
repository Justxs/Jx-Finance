using JxFinance.Domain.Common;
using JxFinance.Domain.ExchangeRates;

namespace JxFinance.Tests.Unit;

public class RateHistoryTests
{
    private static readonly DateOnly Friday = new(2026, 9, 18);

    [Fact]
    public void A_rate_entered_by_hand_wins_over_the_synced_rate_of_the_same_date()
    {
        var history = new RateHistory([Synced(Friday, Currency.Usd, 1.10m)], [Manual(Friday, Currency.Usd, 1.20m)]);

        Assert.Equal(1.20m, history.OnOrBefore(Friday).Rate(Currency.Eur, Currency.Usd));
    }

    [Fact]
    public void A_newer_synced_rate_replaces_an_older_rate_entered_by_hand()
    {
        var history = new RateHistory(
            [Synced(Friday, Currency.Usd, 1.10m)],
            [Manual(Friday.AddDays(-1), Currency.Usd, 1.20m)]);

        Assert.Equal(1.20m, history.OnOrBefore(Friday.AddDays(-1)).Rate(Currency.Eur, Currency.Usd));
        Assert.Equal(1.10m, history.OnOrBefore(Friday).Rate(Currency.Eur, Currency.Usd));
    }

    [Fact]
    public void A_rate_entered_on_a_weekend_keeps_the_other_currencies_of_the_last_business_day()
    {
        var sunday = Friday.AddDays(2);
        var history = new RateHistory(
            [Synced(Friday, Currency.Usd, 1.10m), Synced(Friday, Currency.Gbp, 0.80m)],
            [Manual(sunday, Currency.Usd, 1.20m)]);

        var table = history.OnOrBefore(sunday);

        Assert.Equal((sunday, Friday), (table.AsOf, table.SyncedAsOf));
        Assert.Equal(1.20m, table.Rate(Currency.Eur, Currency.Usd));
        Assert.Equal(0.80m, table.Rate(Currency.Eur, Currency.Gbp));
    }

    [Fact]
    public void A_currency_more_than_five_days_older_than_the_table_is_left_out()
    {
        var later = Friday.AddDays(RateTable.MaxGapDays + 1);
        var history = new RateHistory(
            [Synced(Friday, Currency.Usd, 1.10m), Synced(Friday, Currency.Gbp, 0.80m)],
            [Manual(later, Currency.Usd, 1.20m)]);

        var table = history.OnOrBefore(later);

        Assert.Equal(1.20m, table.Rate(Currency.Eur, Currency.Usd));
        Assert.Null(table.Rate(Currency.Eur, Currency.Gbp));
        Assert.True(table.IsFreshOn(later));
        Assert.False(table.IsSyncedFreshOn(later));
    }

    [Fact]
    public void Only_rates_entered_by_hand_leave_no_synced_date()
    {
        var history = new RateHistory([], [Manual(Friday, Currency.Usd, 1.20m)]);

        var table = history.OnOrBefore(Friday);

        Assert.Equal(1.20m, table.Rate(Currency.Eur, Currency.Usd));
        Assert.Null(table.SyncedAsOf);
        Assert.Same(RateTable.Empty, history.OnOrBefore(Friday.AddDays(-1)));
    }

    private static ExchangeRate Synced(DateOnly date, Currency currency, decimal rate) =>
        new() { Date = date, Currency = currency, Rate = rate };

    private static ManualExchangeRate Manual(DateOnly date, Currency currency, decimal rate) =>
        new() { Date = date, Currency = currency, Rate = rate };
}
