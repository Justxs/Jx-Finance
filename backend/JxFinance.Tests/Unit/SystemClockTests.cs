using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Time;

namespace JxFinance.Tests.Unit;

public sealed class SystemClockTests
{
    private static IClock CreateClock(string timeZone) =>
        new SystemClock(new FixedSettings(new InstanceSettings { TimeZone = timeZone }));

    private sealed class FixedSettings(InstanceSettings settings) : IInstanceSettingsStore
    {
        public InstanceSettingsSnapshot Current { get; private set; } = InstanceSettingsSnapshot.From(settings);

        public InstanceSettings Defaults() => settings;

        public void Set(InstanceSettings value) => Current = InstanceSettingsSnapshot.From(value);
    }

    [Theory]
    [InlineData("America/Santiago", 2024, 9, 8)]
    [InlineData("America/Havana", 2024, 3, 10)]
    [InlineData("Asia/Beirut", 2024, 3, 31)]
    public void Start_of_day_is_the_transition_when_daylight_saving_skips_midnight(string timeZone, int year, int month, int day)
    {
        var clock = CreateClock(timeZone);
        var date = new DateOnly(year, month, day);
        Assert.True(clock.TimeZone.IsInvalidTime(date.ToDateTime(TimeOnly.MinValue)));

        var start = clock.StartOfDay(date);

        AssertIsFirstInstantOf(date, start, clock.TimeZone);
        Assert.Equal(new TimeOnly(1, 0), TimeOnly.FromDateTime(TimeZoneInfo.ConvertTime(start, clock.TimeZone).DateTime));
    }

    [Theory]
    [InlineData("America/Havana", 2024, 11, 3)]
    [InlineData("America/Santiago", 2024, 4, 7)]
    [InlineData("Europe/Vilnius", 2024, 3, 31)]
    [InlineData("Europe/Vilnius", 2024, 10, 27)]
    [InlineData("Europe/Vilnius", 2026, 9, 19)]
    [InlineData("Pacific/Kiritimati", 2026, 1, 1)]
    [InlineData("UTC", 2026, 1, 1)]
    public void Start_of_day_is_the_first_instant_of_the_local_date(string timeZone, int year, int month, int day)
    {
        var clock = CreateClock(timeZone);
        var date = new DateOnly(year, month, day);

        var start = clock.StartOfDay(date);

        AssertIsFirstInstantOf(date, start, clock.TimeZone);
    }

    [Fact]
    public void Start_of_day_on_a_repeated_midnight_is_the_earlier_one()
    {
        var clock = CreateClock("America/Havana");
        var date = new DateOnly(2024, 11, 3);
        Assert.True(clock.TimeZone.IsAmbiguousTime(date.ToDateTime(TimeOnly.MinValue)));

        var start = clock.StartOfDay(date);

        Assert.Equal(new DateTimeOffset(2024, 11, 3, 4, 0, 0, TimeSpan.Zero), start);
    }

    private static void AssertIsFirstInstantOf(DateOnly date, DateTimeOffset start, TimeZoneInfo zone)
    {
        Assert.Equal(TimeSpan.Zero, start.Offset);
        Assert.Equal(date, DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(start, zone).DateTime));
        Assert.True(DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(start.AddSeconds(-1), zone).DateTime) < date);
    }

    [Fact]
    public void Today_is_the_date_in_the_configured_zone()
    {
        var clock = CreateClock("Pacific/Kiritimati");

        var expected = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, clock.TimeZone).DateTime);

        Assert.Equal(expected, clock.Today);
    }
}
