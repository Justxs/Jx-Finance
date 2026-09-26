using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Time;

public sealed class UtcClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;

    public TimeZoneInfo TimeZone => TimeZoneInfo.Utc;

    public DateTimeOffset StartOfDay(DateOnly date) => new(date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
}
