using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Time;
using Microsoft.Extensions.Options;

namespace JxFinance.Tests.Unit;

public sealed class SystemClockTests
{
    private static SystemClock CreateClock(string timeZone) =>
        new(Options.Create(new AppOptions { TimeZone = timeZone }));

    [Fact]
    public void UtcNow_is_in_utc()
    {
        var clock = CreateClock("UTC");

        Assert.Equal(TimeSpan.Zero, clock.UtcNow.Offset);
    }

    [Fact]
    public void CurrentMonth_starts_at_midnight_on_the_first_in_the_configured_zone()
    {
        var clock = CreateClock("Europe/Vilnius");

        var month = clock.CurrentMonth();
        var startLocal = TimeZoneInfo.ConvertTime(month.StartUtc, clock.TimeZone);

        Assert.True(month.StartUtc < month.EndUtc);
        Assert.Equal(1, startLocal.Day);
        Assert.Equal(0, startLocal.Hour);
        Assert.Equal(0, startLocal.Minute);
    }

    [Fact]
    public void CurrentMonth_spans_exactly_one_month_in_the_configured_zone()
    {
        var clock = CreateClock("Europe/Vilnius");

        var month = clock.CurrentMonth();
        var startLocal = TimeZoneInfo.ConvertTime(month.StartUtc, clock.TimeZone);
        var endLocal = TimeZoneInfo.ConvertTime(month.EndUtc, clock.TimeZone);

        Assert.Equal(startLocal.AddMonths(1), endLocal);
    }
}
