using System.Globalization;
using JxFinance.Common.Assets;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Tests.Unit;

public sealed class AssetValueTests
{
    private static readonly DateOnly Start = new(2025, 1, 31);
    private static readonly Depreciation Car = new(Start, 10000m, 96, 1500m);
    private static readonly AssetValuation[] Bought = [Valuation("2025-01-31", 10000m)];

    [Fact]
    public void The_monthly_amount_is_the_loss_over_the_life_rounded_up_to_the_cent() =>
        Assert.Equal(88.55m, AssetValue.MonthlyAmount(Car));

    [Theory]
    [InlineData("2025-01-30", null)]
    [InlineData("2025-01-31", 10000.0)]
    [InlineData("2025-02-27", 10000.0)]
    [InlineData("2025-02-28", 9911.45)]
    [InlineData("2025-03-30", 9911.45)]
    [InlineData("2025-03-31", 9822.90)]
    [InlineData("2033-01-30", 1587.75)]
    [InlineData("2033-01-31", 1500.0)]
    [InlineData("2040-06-01", 1500.0)]
    public void The_value_falls_in_monthly_steps_on_the_start_day_down_to_the_residual(string date, double? expected) =>
        Assert.Equal((decimal?)expected, AssetValue.On(Day(date), Bought, Car));

    [Theory]
    [InlineData("2026-02-15", 9500, "2026-02-27", 9500)]
    [InlineData("2026-02-15", 9500, "2026-02-28", 9411.45)]
    [InlineData("2026-01-31", 5000, "2026-03-31", 4822.90)]
    [InlineData("2026-01-31", 1000, "2027-01-31", 1000)]
    public void A_revaluation_restarts_the_decline_from_its_value_at_the_same_monthly_amount(
        string revalued,
        double value,
        string date,
        double expected)
    {
        AssetValuation[] valuations = [.. Bought, Valuation(revalued, (decimal)value)];

        Assert.Equal((decimal)expected, AssetValue.On(Day(date), valuations, Car));
    }

    [Theory]
    [InlineData("2025-01-30", 12000)]
    [InlineData("2025-01-31", 10000.0)]
    [InlineData("2025-02-28", 9911.45)]
    public void A_valuation_before_the_start_date_counts_until_the_decline_starts(string date, double expected) =>
        Assert.Equal((decimal)expected, AssetValue.On(Day(date), [Valuation("2024-06-01", 12000m)], Car));

    [Fact]
    public void Without_depreciation_the_value_is_the_latest_valuation_on_or_before_the_date()
    {
        AssetValuation[] flat = [Valuation("2024-01-10", 140000m), Valuation("2025-01-10", 150000m)];

        Assert.Equal(140000m, AssetValue.On(new DateOnly(2025, 1, 9), flat, null));
        Assert.Equal(150000m, AssetValue.On(new DateOnly(2030, 1, 1), flat, null));
    }

    [Fact]
    public void A_residual_equal_to_the_start_value_keeps_the_value() =>
        Assert.Equal(10000m, AssetValue.On(new DateOnly(2030, 1, 1), Bought, Car with { ResidualValue = 10000m }));

    [Fact]
    public void Full_depreciation_is_reached_on_the_step_that_hits_the_residual()
    {
        Assert.Equal(new DateOnly(2033, 1, 31), AssetValue.FullyDepreciatedOn(Bought, Car));
        Assert.Equal(new DateOnly(2033, 8, 31), AssetValue.FullyDepreciatedOn([.. Bought, Valuation("2026-02-15", 9500m)], Car));
        Assert.Equal(new DateOnly(2026, 2, 15), AssetValue.FullyDepreciatedOn([.. Bought, Valuation("2026-02-15", 900m)], Car));
    }

    [Fact]
    public void The_series_samples_the_range_and_marks_every_valuation()
    {
        AssetValuation[] valuations = [.. Bought, Valuation("2025-06-15", 9000m)];

        var series = AssetValue.Series(new DateOnly(2025, 1, 1), new DateOnly(2026, 1, 31), valuations, Car).ToList();

        Assert.Equal((Start, 10000m, true), series[0]);
        Assert.Equal((new DateOnly(2026, 1, 31), AssetValue.On(new DateOnly(2026, 1, 31), valuations, Car)!.Value, false), series[^1]);
        Assert.Equal([Start, new DateOnly(2025, 6, 15)], series.Where(p => p.IsValuation).Select(p => p.Date));
        Assert.Contains((new DateOnly(2025, 6, 15), 9000m, true), series);
        Assert.Equal(series.Select(p => p.Date).Order(), series.Select(p => p.Date));
    }

    private static AssetValuation Valuation(string date, decimal value) =>
        new() { Date = Day(date), Value = value };

    private static DateOnly Day(string date) => DateOnly.Parse(date, CultureInfo.InvariantCulture);
}
