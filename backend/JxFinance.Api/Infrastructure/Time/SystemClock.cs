using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Configuration;
using Microsoft.Extensions.Options;

namespace JxFinance.Infrastructure.Time;

public sealed class SystemClock : IClock
{
    public TimeZoneInfo TimeZone { get; }

    public SystemClock(IOptions<AppOptions> options)
    {
        TimeZone = TimeZoneInfo.FindSystemTimeZoneById(options.Value.TimeZone);
    }

    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;

    public DateTimeOffset ToAppTime(DateTimeOffset instant) => TimeZoneInfo.ConvertTime(instant, TimeZone);

    public DateRange CurrentMonth()
    {
        var nowLocal = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, TimeZone);
        var startLocal = new DateTime(nowLocal.Year, nowLocal.Month, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var endLocal = startLocal.AddMonths(1);

        var startUtc = TimeZoneInfo.ConvertTimeToUtc(startLocal, TimeZone);
        var endUtc = TimeZoneInfo.ConvertTimeToUtc(endLocal, TimeZone);

        return new DateRange(
            new DateTimeOffset(startUtc, TimeSpan.Zero),
            new DateTimeOffset(endUtc, TimeSpan.Zero));
    }
}
