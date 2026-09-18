using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Time;

namespace JxFinance.Tests.Unit;

public sealed class SystemClockTests
{
    private static SystemClock CreateClock(string timeZone) =>
        new(new FixedSettings(new InstanceSettings { TimeZone = timeZone }));

    private sealed class FixedSettings(InstanceSettings settings) : IInstanceSettingsStore
    {
        public InstanceSettingsSnapshot Current { get; private set; } = InstanceSettingsSnapshot.From(settings);

        public InstanceSettings Defaults() => settings;

        public void Set(InstanceSettings value) => Current = InstanceSettingsSnapshot.From(value);
    }

    [Fact]
    public void UtcNow_is_in_utc()
    {
        var clock = CreateClock("UTC");

        Assert.Equal(TimeSpan.Zero, clock.UtcNow.Offset);
    }

    [Fact]
    public void Today_is_the_date_in_the_configured_zone()
    {
        var clock = CreateClock("Pacific/Kiritimati");

        var expected = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, clock.TimeZone).DateTime);

        Assert.Equal(expected, clock.Today);
    }
}
