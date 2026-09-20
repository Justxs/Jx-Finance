using JxFinance.Common.Settings;
using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Time;

public sealed class SystemClock : IClock
{
    private readonly IInstanceSettingsStore settings;

    public SystemClock(IInstanceSettingsStore settings)
    {
        this.settings = settings;
    }

    public TimeZoneInfo TimeZone => settings.Current.TimeZone;

    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;

    public DateTimeOffset ToAppTime(DateTimeOffset instant) => TimeZoneInfo.ConvertTime(instant, TimeZone);

    public DateOnly Today => DateOnly.FromDateTime(ToAppTime(UtcNow).DateTime);

    public DateTimeOffset StartOfDay(DateOnly date)
    {
        var zone = TimeZone;
        var midnight = date.ToDateTime(TimeOnly.MinValue);
        DateTime[] probes = [midnight.AddHours(-12), midnight.AddHours(12)];

        return probes
            .Where(probe => !zone.IsInvalidTime(probe))
            .Select(probe => new DateTimeOffset(midnight, zone.GetUtcOffset(probe)).ToUniversalTime())
            .Where(instant => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, zone).DateTime) == date)
            .DefaultIfEmpty(new DateTimeOffset(midnight, zone.BaseUtcOffset).ToUniversalTime())
            .Min();
    }
}
