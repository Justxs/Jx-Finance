using JxFinance.Domain.Investments;

namespace JxFinance.Tests.Unit;

public sealed class MoneyWeightedReturnTests
{
    private static readonly DateOnly Start = new(2025, 1, 1);

    [Fact]
    public void One_buy_worth_ten_percent_more_a_year_later_returns_ten_percent()
    {
        var rate = MoneyWeightedReturn.Annualized([(Start, -1000m), (Start.AddDays(365), 1100m)]);

        Assert.Equal(0.1m, rate);
    }

    [Fact]
    public void Money_added_later_counts_for_the_time_it_was_invested()
    {
        var rate = MoneyWeightedReturn.Annualized(
        [
            (Start, -1000m),
            (Start.AddDays(182), -1000m),
            (Start.AddDays(182), 20m),
            (Start.AddDays(365), 2100m),
        ]);

        Assert.NotNull(rate);
        Assert.InRange(rate.Value, 0.07m, 0.09m);
    }

    [Fact]
    public void A_loss_is_negative()
    {
        Assert.Equal(-0.2m, MoneyWeightedReturn.Annualized([(Start, -500m), (Start.AddDays(365), 400m)]));
    }

    [Fact]
    public void Flows_in_one_direction_or_under_a_month_have_no_rate()
    {
        Assert.Null(MoneyWeightedReturn.Annualized([(Start, -1000m), (Start.AddDays(40), -10m)]));
        Assert.Null(MoneyWeightedReturn.Annualized([(Start, -1000m), (Start.AddDays(10), 1010m)]));
        Assert.Null(MoneyWeightedReturn.Annualized([]));
    }
}
