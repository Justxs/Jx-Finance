using JxFinance.Common;

namespace JxFinance.Tests.Unit;

public sealed class StatisticsTests
{
    [Fact]
    public void The_median_of_an_even_count_is_the_mean_of_the_middle_pair()
    {
        Assert.Equal(2.5m, Statistics.Median([4m, 1m, 3m, 2m]));
        Assert.Equal(3m, Statistics.Median([5m, 1m, 3m]));
    }

    [Fact]
    public void The_spread_is_the_scaled_median_absolute_deviation()
    {
        decimal[] values = [10m, 12m, 14m, 11m, 40m];
        var median = Statistics.Median(values);

        Assert.Equal(12m, median);
        Assert.Equal(2m * Statistics.MadScale, Statistics.Spread(values, median));
    }

    [Fact]
    public void Identical_values_have_no_spread()
    {
        Assert.Equal(0m, Statistics.Spread([7m, 7m, 7m], 7m));
    }
}
