using JxFinance.Domain.Common;

namespace JxFinance.Tests.Support;

public sealed class TestClock(DateTimeOffset? now = null) : IClock
{
    public DateTimeOffset UtcNow { get; set; } = now ?? DateTimeOffset.UtcNow;

    public TimeZoneInfo TimeZone => TimeZoneInfo.Utc;

    public DateOnly Today => DateOnly.FromDateTime(UtcNow.UtcDateTime);

    public DateTimeOffset StartOfDay(DateOnly date) => new(date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
}
