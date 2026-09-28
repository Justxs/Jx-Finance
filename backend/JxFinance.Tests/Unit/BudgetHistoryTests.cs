using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Tests.Unit;

public sealed class BudgetHistoryTests
{
    [Fact]
    public void Zero_windows_count_towards_the_median()
    {
        Assert.Equal(20m, BudgetHistory.Median([0m, 0m, 50m, 60m, 40m, 0m]));
        Assert.Equal(30m, BudgetHistory.SuggestedLimit([0m, 30m, 40m, 0m, 50m]));
    }

    [Fact]
    public void Fewer_than_three_windows_suggest_nothing()
    {
        Assert.Null(BudgetHistory.Median([100m, 120m]));
        Assert.Null(BudgetHistory.SuggestedLimit([100m, 120m]));
        Assert.Equal(110m, BudgetHistory.SuggestedLimit([100m, 120m, 110m]));
    }

    [Fact]
    public void A_zero_median_suggests_nothing()
    {
        Assert.Equal(0m, BudgetHistory.Median([0m, 0m, 0m, 80m]));
        Assert.Null(BudgetHistory.SuggestedLimit([0m, 0m, 0m, 80m]));
    }

    [Theory]
    [InlineData(312.01, 313)]
    [InlineData(312.00, 312)]
    [InlineData(0.40, 1)]
    public void The_limit_is_the_median_rounded_up_to_a_whole_unit(decimal median, decimal limit)
    {
        Assert.Equal(limit, BudgetHistory.SuggestedLimit([median, median, median]));
    }

    [Fact]
    public void Six_similar_months_are_steady()
    {
        Assert.True(BudgetHistory.IsSteady([300m, 310m, 320m, 305m, 315m, 330m]));
    }

    [Fact]
    public void A_month_without_spending_is_not_steady()
    {
        Assert.False(BudgetHistory.IsSteady([300m, 310m, 0m, 305m, 315m, 330m]));
    }

    [Fact]
    public void Fewer_than_six_windows_are_not_steady()
    {
        Assert.False(BudgetHistory.IsSteady([300m, 310m, 320m, 305m, 315m]));
    }

    [Fact]
    public void The_median_must_reach_the_floor()
    {
        Assert.True(BudgetHistory.IsSteady([20m, 20m, 20m, 20m, 20m, 20m]));
        Assert.False(BudgetHistory.IsSteady([19.99m, 19.99m, 19.99m, 19.99m, 19.99m, 19.99m]));
    }

    [Theory]
    [InlineData(16.86, true)]
    [InlineData(16.87, false)]
    public void The_spread_may_reach_a_quarter_of_the_median_and_no_more(decimal deviation, bool steady)
    {
        Assert.Equal(steady, BudgetHistory.IsSteady([100m, 100m, 100m - deviation, 100m + deviation, 100m - deviation, 100m + deviation]));
    }
}
