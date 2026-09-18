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
}
